import { Octokit } from "octokit";
import { db } from "./db";
import { repoGraphs } from "./schema";
import { eq } from "drizzle-orm";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export interface ArchGraph {
  nodes: string[];
  edges: [string, string][]; // [from, to]
}

export async function buildImportGraph(owner: string, repo: string): Promise<ArchGraph> {
  const existing = await db.query.repoGraphs.findFirst({
    where: (rg, { and, eq }) => and(eq(rg.owner, owner), eq(rg.repo, repo)),
  });

  // Cache for 24h
  if (existing && Date.now() - new Date(existing.computedAt).getTime() < 24 * 60 * 60 * 1000) {
    return existing.graphData as ArchGraph;
  }

  try {
    // 1. Get entire repo tree recursively
    const { data: treeRes } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: "main", // fallback to master if needed
      recursive: "true",
    });

    const files = treeRes.tree
      .filter((n) => n.type === "blob" && /\.(ts|tsx|js|jsx|go|rs|py)$/.test(n.path || ""))
      .slice(0, 300); // Limit to 300 files for edge performance

    const nodes = files.map((f) => f.path!);
    const edges: [string, string][] = [];

    // 2. Process in batches of 10 to avoid rate limits/timeouts
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
              const content = Buffer.from(data.content, "base64").toString("utf-8");
              // Improved regex for TS/JS imports and Go/Rust/Python
              const importMatches = content.matchAll(/(?:import|from|require|use|include)\s+['"]([^'"]+)['"]/g);
              
              for (const match of importMatches) {
                const target = match[1];
                // Resolve relative path (simplified)
                const targetPath = resolvePath(file.path!, target, nodes);
                if (targetPath) {
                  edges.push([file.path!, targetPath]);
                }
              }
            }
          } catch (e) {
            // Skip binary or too large files
          }
        })
      );
    }

    const graph: ArchGraph = { nodes, edges };

    await db
      .insert(repoGraphs)
      .values({ owner, repo, graphData: graph })
      .onConflictDoUpdate({ target: [repoGraphs.owner, repoGraphs.repo], set: { graphData: graph, computedAt: new Date() } });

    return graph;
  } catch (err) {
    console.error("Failed to build arch graph:", err);
    return { nodes: [], edges: [] };
  }
}

function resolvePath(current: string, target: string, nodes: string[]): string | null {
  if (!target.startsWith(".")) return null; // Ignore external libs for arch score

  const parts = current.split("/");
  parts.pop(); // remove filename
  
  const targetParts = target.split("/");
  for (const p of targetParts) {
    if (p === "..") parts.pop();
    else if (p !== ".") parts.push(p);
  }

  const resolved = parts.join("/");
  // Try exact match or with extensions
  return nodes.find(n => n.startsWith(resolved)) || null;
}

export function computeArchScores(files: string[], graph: ArchGraph) {
  const fanIn: Record<string, number> = {};
  for (const [, to] of graph.edges) {
    fanIn[to] = (fanIn[to] ?? 0) + 1;
  }

  return files.map((filename) => {
    const score = fanIn[filename] ?? 0;
    // Weight by 8x for core files, cap at 100
    const archScore = Math.min(100, score * 8);
    
    let label: "leaf" | "utility" | "infrastructure" = "leaf";
    if (archScore > 60) label = "infrastructure";
    else if (archScore > 25) label = "utility";

    return { filename, archScore, label };
  });
}
