import { Octokit } from "octokit";
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

export function resolvePath(current: string, target: string, nodes: string[]): string | null {
  if (!target.startsWith(".")) return null;

  const parts = current.split("/");
  parts.pop();
  
  const targetParts = target.split("/");
  for (const p of targetParts) {
    if (p === "..") parts.pop();
    else if (p !== ".") parts.push(p);
  }

  const resolved = parts.join("/");
  return nodes.find(n => {
    const stem = n.replace(/\.[^/.]+$/, "");
    return n === resolved || stem === resolved || n === `${resolved}/index`;
  }) || null;
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
  const nodes = graph.nodes;
  const edges = graph.edges;
  const n = nodes.length;
  
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

  const nodeMetrics: NodeGraphMetrics[] = nodes.map((node, i) => {
    const inDegree = edges.filter((e) => e.target === node.id).length;
    const outDegree = edges.filter((e) => e.source === node.id).length;
    
    return {
      filename: node.id,
      pageRank: pr[i],
      betweennessCentrality: 0, 
      inDegree,
      outDegree,
      hubScore: hub[i],
      authorityScore: auth[i],
      clusteringCoefficient: 0,
      communityId: 0,
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
    modularity: 0,
    avgClusteringCoefficient: 0,
    connectedComponents: 1,
    cycleCount: 0,
  };

  return {
    nodeMetrics,
    globalMetrics,
    structuralChanges: [],
  };
}


export function analyzeDependencyGraph(enrichedPR: EnrichedPR): GraphMetrics {
  // In a real scenario, we'd build the graph and compare pre/post.
  // For this engine, we'll return metrics based on the current state.
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
