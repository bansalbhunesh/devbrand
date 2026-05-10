import { Octokit } from "octokit";
import { db } from "../db";
import { repoGraphs } from "../schema";
import { eq, and, gt } from "drizzle-orm";
import type {
  EnrichedPR,
  DependencyGraph,
  GraphMetrics,
  NodeGraphMetrics,
  GlobalGraphMetrics,
  StructuralChange,
  GraphNode,
  GraphEdge,
} from "./types";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Common alias patterns → directory mappings
const ALIAS_MAP: Record<string, string> = {
  "@/": "src/",
  "~/": "src/",
  "#/": "src/",
};

export function resolveAlias(target: string): string | null {
  for (const [alias, dir] of Object.entries(ALIAS_MAP)) {
    if (target.startsWith(alias)) {
      return target.replace(alias, dir);
    }
  }
  return null;
}

export function resolvePath(current: string, target: string, nodes: string[]): string | null {
  // 1. Try relative path resolution
  if (target.startsWith(".")) {
    const parts = current.split("/");
    parts.pop();
    
    const targetParts = target.split("/");
    for (const p of targetParts) {
      if (p === "..") parts.pop();
      else if (p !== ".") parts.push(p);
    }

    const resolved = parts.join("/");
    const match = nodes.find(n => {
      const stem = n.replace(/\.[^/.]+$/, "");
      return n === resolved || stem === resolved || n === `${resolved}/index`;
    });
    if (match) return match;
  }

  // 2. Try alias resolution (@/, ~/, #/)
  const aliasResolved = resolveAlias(target);
  if (aliasResolved) {
    const match = nodes.find(n => {
      const stem = n.replace(/\.[^/.]+$/, "");
      return n === aliasResolved || stem === aliasResolved || n === `${aliasResolved}/index`;
    });
    if (match) return match;
  }

  // 3. Fuzzy basename matching (last resort)
  const basename = target.split("/").pop()?.replace(/\.[^/.]+$/, "");
  if (basename && basename.length > 2) {
    const candidates = nodes.filter(n => {
      const nodeName = n.split("/").pop()?.replace(/\.[^/.]+$/, "");
      return nodeName === basename;
    });
    // Only match if there's exactly one candidate (unambiguous)
    if (candidates.length === 1) return candidates[0];
  }

  return null;
}

export async function buildImportGraph(owner: string, repo: string): Promise<DependencyGraph> {
  const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  const { data: treeRes } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: defaultBranch,
    recursive: "true",
  });

  const files = treeRes.tree
    .filter((n) => n.type === "blob" && /\.(ts|tsx|js|jsx|go|rs|py)$/.test(n.path || ""))
    .slice(0, 300);

  const nodes: GraphNode[] = files.map((f) => ({
    id: f.path!,
    label: f.path!.split("/").pop() || "",
    type: f.path!.includes("test") ? "test" : "source",
    moduleId: f.path!,
    isEntryPoint: false,
    language: f.path!.endsWith(".ts") || f.path!.endsWith(".tsx") ? "typescript" : "javascript",
  }));

  const nodeIds = nodes.map(n => n.id);
  const edges: GraphEdge[] = [];

  const BATCH_SIZE = 15;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (file) => {
        try {
          const { data } = await octokit.rest.repos.getContent({ owner, repo, path: file.path! });
          if ("content" in data) {
            const content = Buffer.from(data.content, "base64").toString("utf-8");
            const importMatches = content.matchAll(/(?:import|from|require|use|include)\s+['"]([^'"]+)['"]/g);
            for (const match of importMatches) {
              const targetPath = resolvePath(file.path!, match[1], nodeIds);
              if (targetPath) {
                edges.push({
                  source: file.path!,
                  target: targetPath,
                  type: "import",
                  weight: 1,
                });
              }
            }
          }
        } catch {}
      })
    );
  }

  return { nodes, edges, preComputedAt: new Date() };
}

export function computeGraphMetrics(graph: DependencyGraph): GraphMetrics {
  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];
  const n = nodes.length;
  
  if (n === 0) {
    return {
      nodeMetrics: [],
      globalMetrics: {
        avgPathLength: 0,
        diameter: 0,
        density: 0,
        modularity: 0,
        avgClusteringCoefficient: 0,
        connectedComponents: 0,
        cycleCount: 0,
      },
      structuralChanges: [],
    };
  }

  // 1. Initialize PageRank
  let pr = new Array(n).fill(1 / n);
  const damping = 0.85;
  const iterations = 10;

  for (let iter = 0; iter < iterations; iter++) {
    const nextPr = new Array(n).fill((1 - damping) / n);
    for (const edge of edges) {
      const sourceIdx = nodes.findIndex(node => node.id === edge.source);
      const targetIdx = nodes.findIndex(node => node.id === edge.target);
      if (sourceIdx !== -1 && targetIdx !== -1) {
        const outDegree = edges.filter(e => e.source === nodes[sourceIdx].id).length;
        nextPr[targetIdx] += damping * (pr[sourceIdx] / (outDegree || 1));
      }
    }
    pr = nextPr;
  }

  // 2. Compute Hubs and Authorities (HITS)
  let auth = new Array(n).fill(1);
  let hub = new Array(n).fill(1);
  
  for (let iter = 0; iter < 5; iter++) {
    // Update Auth
    const nextAuth = new Array(n).fill(0);
    for (const edge of edges) {
      const sourceIdx = nodes.findIndex(node => node.id === edge.source);
      const targetIdx = nodes.findIndex(node => node.id === edge.target);
      if (sourceIdx !== -1 && targetIdx !== -1) {
        nextAuth[targetIdx] += hub[sourceIdx];
      }
    }
    auth = nextAuth;
    // Normalize Auth
    const authNorm = Math.sqrt(auth.reduce((s, v) => s + v * v, 0)) || 1;
    auth = auth.map(v => v / authNorm);

    // Update Hub
    const nextHub = new Array(n).fill(0);
    for (const edge of edges) {
      const sourceIdx = nodes.findIndex(node => node.id === edge.source);
      const targetIdx = nodes.findIndex(node => node.id === edge.target);
      if (sourceIdx !== -1 && targetIdx !== -1) {
        nextHub[sourceIdx] += auth[targetIdx];
      }
    }
    hub = nextHub;
    // Normalize Hub
    const hubNorm = Math.sqrt(hub.reduce((s, v) => s + v * v, 0)) || 1;
    hub = hub.map(v => v / hubNorm);
  }

  // 3. Compute True Betweenness Centrality (Brandes' Algorithm)
  const cb = new Array(n).fill(0);
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const edge of edges) {
    const s = nodes.findIndex(node => node.id === edge.source);
    const t = nodes.findIndex(node => node.id === edge.target);
    if (s !== -1 && t !== -1) adj[s].push(t);
  }

  for (let s = 0; s < n; s++) {
    const S: number[] = [];
    const P: number[][] = Array.from({ length: n }, () => []);
    const sigma = new Array(n).fill(0);
    sigma[s] = 1;
    const d = new Array(n).fill(-1);
    d[s] = 0;
    const Q: number[] = [s];

    while (Q.length > 0) {
      const v = Q.shift()!;
      S.push(v);
      for (const w of adj[v]) {
        if (d[w] < 0) {
          Q.push(w);
          d[w] = d[v] + 1;
        }
        if (d[w] === d[v] + 1) {
          sigma[w] += sigma[v];
          P[w].push(v);
        }
      }
    }

    const delta = new Array(n).fill(0);
    while (S.length > 0) {
      const w = S.pop()!;
      for (const v of P[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      }
      if (w !== s) cb[w] += delta[w];
    }
  }
  const maxCb = Math.max(...cb, 1);
  const normalizedCb = cb.map(v => (v / maxCb) * 100);

  // 4. Compute Clustering Coefficient
  const cc = new Array(n).fill(0);
  const undirAdj: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (const edge of edges) {
    const s = nodes.findIndex(node => node.id === edge.source);
    const t = nodes.findIndex(node => node.id === edge.target);
    if (s !== -1 && t !== -1 && s !== t) {
      undirAdj[s].add(t);
      undirAdj[t].add(s);
    }
  }

  for (let i = 0; i < n; i++) {
    const neighbors = Array.from(undirAdj[i]);
    const k = neighbors.length;
    if (k < 2) continue;
    let links = 0;
    for (let u = 0; u < k; u++) {
      for (let v = u + 1; v < k; v++) {
        if (undirAdj[neighbors[u]].has(neighbors[v])) links++;
      }
    }
    cc[i] = (2.0 * links) / (k * (k - 1));
  }

  // 5. Community Detection (Label Propagation Algorithm)
  const communities = new Array(n).fill(0).map((_, i) => i);
  let changed = true;
  let iters = 0;
  while (changed && iters < 10) {
    changed = false;
    const order = new Array(n).fill(0).map((_, i) => i).sort(() => Math.random() - 0.5);
    for (const i of order) {
      const neighborLabels = new Map<number, number>();
      for (const t of undirAdj[i]) {
        const label = communities[t];
        neighborLabels.set(label, (neighborLabels.get(label) || 0) + 1);
      }
      if (neighborLabels.size === 0) continue;
      let maxCount = 0;
      let bestLabel = communities[i];
      for (const [label, count] of neighborLabels.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestLabel = label;
        }
      }
      if (communities[i] !== bestLabel) {
        communities[i] = bestLabel;
        changed = true;
      }
    }
    iters++;
  }

  let m = 0;
  for (const list of undirAdj) m += list.size;
  m = m / 2;
  let q = 0;
  if (m > 0) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (communities[i] === communities[j]) {
          const a = undirAdj[i].has(j) ? 1 : 0;
          q += (a - (undirAdj[i].size * undirAdj[j].size) / (2 * m));
        }
      }
    }
    q = q / (2 * m);
  }

  const nodeMetrics: NodeGraphMetrics[] = nodes.map((node, i) => {
    const inDegree = edges.filter((e) => e.target === node.id).length;
    const outDegree = edges.filter((e) => e.source === node.id).length;
    
    // PageRank normalized (0-1 range usually, but we want a readable score component)
    const prScore = Math.min(100, pr[i] * n * 20); 
    const hubAuthScore = (hub[i] + auth[i]) * 50;
    // We keep Force Multiplier logic for ArchScore integration but now expose true betweenness
    const forceMultiplier = Math.min(100, (prScore * 0.6) + (hubAuthScore * 0.4));

    return {
      filename: node.id,
      pageRank: pr[i],
      betweennessCentrality: normalizedCb[i], 
      inDegree,
      outDegree,
      hubScore: hub[i],
      authorityScore: auth[i],
      clusteringCoefficient: cc[i],
      communityId: communities[i],
      efferentCoupling: outDegree,
      afferentCoupling: inDegree,
      instability: outDegree / (inDegree + outDegree || 1),
      abstractness: 0,
      distanceFromMainSequence: 0,
    };
  });

  const globalMetrics: GlobalGraphMetrics = {
    avgPathLength: 0,
    diameter: 0,
    density: edges.length / (n * (n - 1) || 1),
    modularity: q,
    avgClusteringCoefficient: cc.reduce((a, b) => a + b, 0) / n,
    connectedComponents: 1,
    cycleCount: 0,
  };

  return {
    nodeMetrics,
    globalMetrics,
    structuralChanges: [],
  };
}


export async function analyzeDependencyGraph(enrichedPR: EnrichedPR): Promise<GraphMetrics> {
  const { owner, repo } = enrichedPR.metadata;
  
  try {
    // 1. Check cache: use repo_graphs if we have a fresh entry (<24h)
    const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - CACHE_TTL_MS);
    let graph: DependencyGraph;

    try {
      const cached = await db.query.repoGraphs.findFirst({
        where: and(
          eq(repoGraphs.owner, owner),
          eq(repoGraphs.repo, repo),
          gt(repoGraphs.computedAt, cutoff)
        ),
      });

      if (cached) {
        console.log(`[Layer 2] Using cached graph for ${owner}/${repo}`);
        graph = cached.graphData as unknown as DependencyGraph;
      } else {
        // Build fresh and persist
        graph = await buildImportGraph(owner, repo);
        await db.insert(repoGraphs).values({
          owner,
          repo,
          graphData: graph as any,
        }).onConflictDoUpdate({
          target: [repoGraphs.owner, repoGraphs.repo],
          set: { graphData: graph as any, computedAt: new Date() },
        });
        console.log(`[Layer 2] Built and cached graph for ${owner}/${repo}`);
      }
    } catch (cacheErr) {
      // Cache miss or DB error — build fresh without caching
      console.warn("[Layer 2] Cache unavailable, building graph fresh", cacheErr);
      graph = await buildImportGraph(owner, repo);
    }
    
    // 2. Compute PageRank, HITS, and coupling metrics
    const metrics = computeGraphMetrics(graph);
    
    // 3. Filter metrics to only include files relevant to this PR
    const prFiles = new Set(enrichedPR.diffs.map(d => d.filename));
    const prNodeMetrics = metrics.nodeMetrics.filter(m => prFiles.has(m.filename));
    
    return {
      ...metrics,
      nodeMetrics: prNodeMetrics,
    };
  } catch (error) {
    console.error("[Layer 2] Graph analysis failed:", error);
    return {
      nodeMetrics: [],
      globalMetrics: {
        avgPathLength: 0,
        diameter: 0,
        density: 0,
        modularity: 0,
        avgClusteringCoefficient: 0,
        connectedComponents: 0,
        cycleCount: 0,
      },
      structuralChanges: [],
    };
  }
}

