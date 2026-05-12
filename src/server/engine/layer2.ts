import { Octokit } from "octokit";
import { db } from "../db.server";
import { repoGraphs } from "../schema.server";
import { eq, and, gt } from "drizzle-orm";
import type {
  EnrichedPR,
  DependencyGraph,
  GraphMetrics,
  NodeGraphMetrics,
  GlobalGraphMetrics,
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

export function resolvePath(
  current: string,
  target: string,
  nodes: string[],
): string | null {
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
    const match = nodes.find((n) => {
      const stem = n.replace(/\.[^/.]+$/, "");
      return n === resolved || stem === resolved || n === `${resolved}/index`;
    });
    if (match) return match;
  }

  // 2. Try alias resolution (@/, ~/, #/)
  const aliasResolved = resolveAlias(target);
  if (aliasResolved) {
    const match = nodes.find((n) => {
      const stem = n.replace(/\.[^/.]+$/, "");
      return (
        n === aliasResolved ||
        stem === aliasResolved ||
        n === `${aliasResolved}/index`
      );
    });
    if (match) return match;
  }

  // 3. Fuzzy basename matching (last resort)
  const basename = target
    .split("/")
    .pop()
    ?.replace(/\.[^/.]+$/, "");
  if (basename && basename.length > 2) {
    const candidates = nodes.filter((n) => {
      const nodeName = n
        .split("/")
        .pop()
        ?.replace(/\.[^/.]+$/, "");
      return nodeName === basename;
    });
    // Only match if there's exactly one candidate (unambiguous)
    if (candidates.length === 1) return candidates[0];
  }

  return null;
}

export async function buildImportGraph(
  owner: string,
  repo: string,
): Promise<DependencyGraph> {
  const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  const { data: treeRes } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: defaultBranch,
    recursive: "true",
  });

  const files = treeRes.tree
    .filter(
      (n) =>
        n.type === "blob" && /\.(ts|tsx|js|jsx|go|rs|py)$/.test(n.path || ""),
    )
    .slice(0, 300);

  const nodes: GraphNode[] = files.map((f) => ({
    id: f.path!,
    label: f.path!.split("/").pop() || "",
    type: f.path!.includes("test") ? "test" : "source",
    moduleId: f.path!,
    isEntryPoint: false,
    language:
      f.path!.endsWith(".ts") || f.path!.endsWith(".tsx")
        ? "typescript"
        : "javascript",
  }));

  const nodeIds = nodes.map((n) => n.id);
  const edges: GraphEdge[] = [];

  const BATCH_SIZE = 15;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (file) => {
        try {
          const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: file.path!,
          });
          if ("content" in data) {
            const content = Buffer.from(data.content, "base64").toString(
              "utf-8",
            );
            const importMatches = content.matchAll(
              /(?:import|from|require|use|include)\s+['"]([^'"]+)['"]/g,
            );
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
        } catch (e) {
          /* ignore fetch failures for specific files */
        }
      }),
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

  // Pre-build an index map + adjacency arrays once. The prior implementation
  // ran edges.filter() and nodes.findIndex() inside the PageRank inner loops,
  // making each iteration O(N*E + E*(N+E)). With N=300 / E~1500 that was
  // tens of millions of ops per iteration; now it's O(E) per iteration.
  const idx = new Map<string, number>();
  for (let i = 0; i < n; i++) idx.set(nodes[i].id, i);

  const outDegree = new Array(n).fill(0);
  const inDegree = new Array(n).fill(0);
  const outEdges: number[][] = Array.from({ length: n }, () => []);
  for (const edge of edges) {
    const s = idx.get(edge.source);
    const t = idx.get(edge.target);
    if (s === undefined || t === undefined) continue;
    outDegree[s]++;
    inDegree[t]++;
    outEdges[s].push(t);
  }

  // 1. PageRank
  let pr = new Array(n).fill(1 / n);
  const damping = 0.85;
  const iterations = 10;

  for (let iter = 0; iter < iterations; iter++) {
    const nextPr = new Array(n).fill((1 - damping) / n);

    let danglingWeight = 0;
    for (let i = 0; i < n; i++) {
      if (outDegree[i] === 0) danglingWeight += damping * (pr[i] / n);
    }
    for (let i = 0; i < n; i++) nextPr[i] += danglingWeight;

    for (let s = 0; s < n; s++) {
      if (outDegree[s] === 0) continue;
      const share = damping * (pr[s] / outDegree[s]);
      for (const t of outEdges[s]) nextPr[t] += share;
    }
    pr = nextPr;
  }

  // 2. HITS — uses the same indexed edges, no more findIndex per iteration.
  let auth = new Array(n).fill(1);
  let hub = new Array(n).fill(1);

  for (let iter = 0; iter < 5; iter++) {
    const nextAuth = new Array(n).fill(0);
    for (let s = 0; s < n; s++) {
      for (const t of outEdges[s]) nextAuth[t] += hub[s];
    }
    auth = nextAuth;
    const authNorm = Math.sqrt(auth.reduce((s, v) => s + v * v, 0)) || 1;
    auth = auth.map((v) => v / authNorm);

    const nextHub = new Array(n).fill(0);
    for (let s = 0; s < n; s++) {
      for (const t of outEdges[s]) nextHub[s] += auth[t];
    }
    hub = nextHub;
    const hubNorm = Math.sqrt(hub.reduce((s, v) => s + v * v, 0)) || 1;
    hub = hub.map((v) => v / hubNorm);
  }

  // 3. Brandes' betweenness centrality (reuses the indexed adjacency built above).
  const cb = new Array(n).fill(0);
  const adj = outEdges;

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
  const normalizedCb = cb.map((v) => (v / maxCb) * 100);

  // 4. Clustering coefficient — undirected adjacency derived from indexed edges.
  const cc = new Array(n).fill(0);
  const undirAdj: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (let s = 0; s < n; s++) {
    for (const t of outEdges[s]) {
      if (s !== t) {
        undirAdj[s].add(t);
        undirAdj[t].add(s);
      }
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
  // Deterministic node order seeded by the graph's structural fingerprint
  // (sum of in/out-degrees). The prior `sort(() => Math.random() - 0.5)`
  // produced a biased non-uniform shuffle AND a different communityId every
  // run on the same input — breaking reproducibility for cached graphs.
  const seed = nodes.reduce(
    (acc, _, i) => acc + outDegree[i] * 31 + inDegree[i] * 17,
    n,
  );
  const stableOrder = new Array(n)
    .fill(0)
    .map((_, i) => i)
    .sort((a, b) => {
      const ha = ((a + 1) * seed) % 100003;
      const hb = ((b + 1) * seed) % 100003;
      return ha - hb;
    });
  const communities = new Array(n).fill(0).map((_, i) => i);
  let changed = true;
  let iters = 0;
  while (changed && iters < 10) {
    changed = false;
    const order = stableOrder;
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
          q += a - (undirAdj[i].size * undirAdj[j].size) / (2 * m);
        }
      }
    }
    q = q / (2 * m);
  }

  const nodeMetrics: NodeGraphMetrics[] = nodes.map((node, i) => {
    const inDeg = inDegree[i];
    const outDeg = outDegree[i];
    return {
      filename: node.id,
      pageRank: pr[i],
      betweennessCentrality: normalizedCb[i],
      inDegree: inDeg,
      outDegree: outDeg,
      hubScore: hub[i],
      authorityScore: auth[i],
      clusteringCoefficient: cc[i],
      communityId: communities[i],
      efferentCoupling: outDeg,
      afferentCoupling: inDeg,
      instability: outDeg / (inDeg + outDeg || 1),
      // Computing abstractness requires distinguishing concrete vs abstract
      // (interfaces, abstract classes) types per file. Out of scope for the
      // current graph build; left as 0 with this note rather than fake-shipped.
      abstractness: 0,
      distanceFromMainSequence: 0,
    };
  });

  // Connected components via union-find over the UNDIRECTED edges. Cheap on
  // the file-graph scale (≤300 nodes); replaces the prior hardcoded `1`.
  const parent = new Array(n).fill(0).map((_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let i = 0; i < n; i++) {
    for (const t of undirAdj[i]) union(i, t);
  }
  const roots = new Set<number>();
  for (let i = 0; i < n; i++) roots.add(find(i));
  const connectedComponents = roots.size;

  // Cycle count via Tarjan-style SCC on the directed graph. We count SCCs
  // with >1 node (true cycles) — replaces the prior hardcoded `0`.
  let cycleCount = 0;
  {
    const indices = new Array(n).fill(-1);
    const lowlinks = new Array(n).fill(0);
    const onStack = new Array(n).fill(false);
    const stack: number[] = [];
    let idxCounter = 0;
    const strongconnect = (v: number) => {
      // Iterative variant to avoid blowing the JS stack on big graphs.
      const work: Array<{ v: number; i: number }> = [{ v, i: 0 }];
      indices[v] = idxCounter;
      lowlinks[v] = idxCounter;
      idxCounter++;
      stack.push(v);
      onStack[v] = true;
      while (work.length > 0) {
        const frame = work[work.length - 1];
        const neighbors = outEdges[frame.v];
        if (frame.i < neighbors.length) {
          const w = neighbors[frame.i++];
          if (indices[w] === -1) {
            indices[w] = idxCounter;
            lowlinks[w] = idxCounter;
            idxCounter++;
            stack.push(w);
            onStack[w] = true;
            work.push({ v: w, i: 0 });
          } else if (onStack[w]) {
            lowlinks[frame.v] = Math.min(lowlinks[frame.v], indices[w]);
          }
        } else {
          if (lowlinks[frame.v] === indices[frame.v]) {
            const scc: number[] = [];
            while (stack.length > 0) {
              const w = stack.pop()!;
              onStack[w] = false;
              scc.push(w);
              if (w === frame.v) break;
            }
            if (scc.length > 1) cycleCount++;
          }
          work.pop();
          if (work.length > 0) {
            const caller = work[work.length - 1];
            lowlinks[caller.v] = Math.min(
              lowlinks[caller.v],
              lowlinks[frame.v],
            );
          }
        }
      }
    };
    for (let v = 0; v < n; v++) {
      if (indices[v] === -1) strongconnect(v);
    }
  }

  const globalMetrics: GlobalGraphMetrics = {
    // avgPathLength and diameter require all-pairs BFS — O(N*(N+E)). On a
    // 300-node graph that's ~hundreds of thousands of ops; cheap but not
    // currently consumed downstream, so left 0 with this note.
    avgPathLength: 0,
    diameter: 0,
    density: n > 1 ? edges.length / (n * (n - 1)) : 0,
    modularity: q,
    avgClusteringCoefficient: n > 0 ? cc.reduce((a, b) => a + b, 0) / n : 0,
    connectedComponents,
    cycleCount,
  };

  return {
    nodeMetrics,
    globalMetrics,
    structuralChanges: [],
  };
}

export async function analyzeDependencyGraph(
  enrichedPR: EnrichedPR,
): Promise<GraphMetrics> {
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
          gt(repoGraphs.computedAt, cutoff),
        ),
      });

      if (cached) {
        console.log(`[Layer 2] Using cached graph for ${owner}/${repo}`);
        graph = cached.graphData as unknown as DependencyGraph;
      } else {
        // Build fresh and persist
        graph = await buildImportGraph(owner, repo);
        await db
          .insert(repoGraphs)
          .values({
            owner,
            repo,
            graphData: graph as any,
          })
          .onConflictDoUpdate({
            target: [repoGraphs.owner, repoGraphs.repo],
            set: { graphData: graph as any, computedAt: new Date() },
          });
        console.log(`[Layer 2] Built and cached graph for ${owner}/${repo}`);
      }
    } catch (cacheErr) {
      // Cache miss or DB error — build fresh without caching
      console.warn(
        "[Layer 2] Cache unavailable, building graph fresh",
        cacheErr,
      );
      graph = await buildImportGraph(owner, repo);
    }

    // 2. Compute PageRank, HITS, and coupling metrics
    const metrics = computeGraphMetrics(graph);

    // 3. Filter metrics to only include files relevant to this PR
    const prFiles = new Set(enrichedPR.diffs.map((d) => d.filename));
    const prNodeMetrics = metrics.nodeMetrics.filter((m) =>
      prFiles.has(m.filename),
    );

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
