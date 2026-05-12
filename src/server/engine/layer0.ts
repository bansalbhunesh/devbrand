import { Octokit } from "octokit";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

// @babel/traverse handles default exports differently depending on the environment
const traverse =
  typeof _traverse === "function" ? _traverse : (_traverse as any).default;
import type {
  PRMetadata,
  FileDiff,
  ASTSymbol,
  ASTDiff,
  EnrichedPR,
  IssueReference,
  CommitHistory,
  FileOwnership,
} from "./types";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function parsePRUrl(
  prUrl: string,
): Promise<{ owner: string; repo: string; prNumber: number }> {
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) throw new Error("INVALID_PR_URL");
  return {
    owner: match[1],
    repo: match[2],
    prNumber: parseInt(match[3], 10),
  };
}

export async function fetchPRMetadata(prUrl: string): Promise<PRMetadata> {
  const { owner, repo, prNumber } = await parsePRUrl(prUrl);

  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  return {
    owner,
    repo,
    prNumber,
    baseSha: pr.base.sha,
    headSha: pr.head.sha,
    title: pr.title,
    body: pr.body || "",
    author: pr.user.login,
    createdAt: new Date(pr.created_at),
    mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changed_files,
  };
}

export async function fetchPRDiff(prUrl: string): Promise<{
  metadata: PRMetadata;
  diffs: FileDiff[];
}> {
  const { owner, repo, prNumber } = await parsePRUrl(prUrl);
  const metadata = await fetchPRMetadata(prUrl);

  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 300,
  });

  const BINARY_EXTENSIONS = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".pdf",
    ".exe",
    ".bin",
    ".zip",
    ".tar",
    ".gz",
  ];

  const diffs: FileDiff[] = files
    .filter((file) => {
      const isBinary = BINARY_EXTENSIONS.some((ext) =>
        file.filename.toLowerCase().endsWith(ext),
      );
      const hasPatch = !!file.patch;
      return !isBinary && hasPatch;
    })
    .map((file) => ({
      filename: file.filename,
      status: file.status as FileDiff["status"],
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch || "",
      previousFilename: file.previous_filename || undefined,
    }));

  if (diffs.length === 0 && files.length > 0) {
    // If we filtered out everything (e.g. only images), provide a minimal stub to avoid crashing
    diffs.push({
      filename: files[0].filename,
      status: files[0].status as FileDiff["status"],
      additions: files[0].additions,
      deletions: files[0].deletions,
      patch: "// [BINARY OR NON-TEXTUAL CHANGE]",
    });
  }

  return { metadata, diffs };
}

export function extractSymbols(code: string, filename: string): ASTSymbol[] {
  const symbols: ASTSymbol[] = [];
  if (!code || !code.trim()) return symbols;

  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx", "decorators-legacy"],
      errorRecovery: true,
    });

    traverse(ast, {
      ExportNamedDeclaration(path: any) {
        if (path.node.declaration) {
          const dec = path.node.declaration;
          if (dec.type === "FunctionDeclaration" && dec.id) {
            symbols.push({
              name: dec.id.name,
              kind: "function",
              startLine: dec.loc?.start.line || 1,
              endLine: dec.loc?.end.line || 1,
              isExported: true,
            });
          } else if (dec.type === "ClassDeclaration" && dec.id) {
            symbols.push({
              name: dec.id.name,
              kind: "class",
              startLine: dec.loc?.start.line || 1,
              endLine: dec.loc?.end.line || 1,
              isExported: true,
            });
          } else if (dec.type === "VariableDeclaration") {
            const kind = dec.kind === "const" ? "const" : "variable";
            for (const d of dec.declarations) {
              if (d.id.type === "Identifier") {
                symbols.push({
                  name: d.id.name,
                  kind,
                  startLine: d.loc?.start.line || 1,
                  endLine: d.loc?.end.line || 1,
                  isExported: true,
                });
              }
            }
          } else if (dec.type === "TSTypeAliasDeclaration" && dec.id) {
            symbols.push({
              name: dec.id.name,
              kind: "type",
              startLine: dec.loc?.start.line || 1,
              endLine: dec.loc?.end.line || 1,
              isExported: true,
            });
          } else if (dec.type === "TSInterfaceDeclaration" && dec.id) {
            symbols.push({
              name: dec.id.name,
              kind: "interface",
              startLine: dec.loc?.start.line || 1,
              endLine: dec.loc?.end.line || 1,
              isExported: true,
            });
          }
        }
      },
      ExportDefaultDeclaration(path: any) {
        let name = "default";
        let kind: ASTSymbol["kind"] = "function";

        if (
          path.node.declaration.type === "FunctionDeclaration" &&
          path.node.declaration.id
        ) {
          name = path.node.declaration.id.name;
        } else if (
          path.node.declaration.type === "ClassDeclaration" &&
          path.node.declaration.id
        ) {
          name = path.node.declaration.id.name;
          kind = "class";
        } else if (path.node.declaration.type === "Identifier") {
          name = path.node.declaration.name;
          kind = "variable";
        }

        symbols.push({
          name,
          kind,
          startLine: path.node.loc?.start.line || 1,
          endLine: path.node.loc?.end.line || 1,
          isExported: true,
        });
      },
    });
  } catch (error) {
    console.warn(`[Layer 0] Failed to parse AST for ${filename}`);
  }

  return symbols;
}

export function generateASTDiff(
  filename: string,
  beforeCode: string,
  afterCode: string,
): ASTDiff {
  const beforeSymbols = extractSymbols(beforeCode, filename);
  const afterSymbols = extractSymbols(afterCode, filename);

  const beforeNames = new Set(beforeSymbols.map((s) => s.name));
  const afterNames = new Set(afterSymbols.map((s) => s.name));

  const addedSymbols = afterSymbols.filter((s) => !beforeNames.has(s.name));
  const removedSymbols = beforeSymbols.filter((s) => !afterNames.has(s.name));
  const changedSymbols = afterSymbols.filter(
    (s) => beforeNames.has(s.name) && !addedSymbols.includes(s),
  );

  const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
  const beforeImports = [...beforeCode.matchAll(importRegex)].map((m) => m[1]);
  const afterImports = [...afterCode.matchAll(importRegex)].map((m) => m[1]);

  const addedImports = afterImports.filter((i) => !beforeImports.includes(i));
  const removedImports = beforeImports.filter((i) => !afterImports.includes(i));

  let semanticChange: ASTDiff["semanticChange"] = "none";
  if (removedSymbols.some((s) => s.isExported)) {
    semanticChange = "breaking";
  } else if (addedImports.length > 0 || removedImports.length > 0) {
    semanticChange = "additive";
  } else if (
    addedSymbols.length > 0 &&
    removedSymbols.length > 0 &&
    afterSymbols.length === beforeSymbols.length
  ) {
    semanticChange = "refactor";
  }

  return {
    filename,
    beforeSymbols,
    afterSymbols,
    addedSymbols,
    removedSymbols,
    changedSymbols,
    addedImports,
    removedImports,
    semanticChange,
  };
}

export async function extractIssueReferences(
  metadata: PRMetadata,
  prBody: string,
): Promise<IssueReference[]> {
  const issues: IssueReference[] = [];
  const issueRegex = /#(\d+)/g;
  const issueNumbers = new Set<number>();

  let match;
  while ((match = issueRegex.exec(prBody)) !== null) {
    issueNumbers.add(parseInt(match[1], 10));
  }

  while ((match = issueRegex.exec(metadata.title)) !== null) {
    issueNumbers.add(parseInt(match[1], 10));
  }

  const issueList = Array.from(issueNumbers);

  for (const issueNumber of issueList.slice(0, 5)) {
    try {
      const { data } = await octokit.rest.issues.get({
        owner: metadata.owner,
        repo: metadata.repo,
        issue_number: issueNumber,
      });

      if (!data.pull_request) {
        const labels = data.labels.map((l) =>
          typeof l === "string" ? l : l.name || "",
        );
        issues.push({
          number: issueNumber,
          title: data.title,
          labels,
          type: "unknown",
          url: data.html_url,
        });
      }
    } catch (e) {
      /* ignore issues for this file */
    }
  }

  return issues;
}

/**
 * Returns up to 50 recent commits that touched the FIRST file in `filePaths`.
 * Despite the parameter shape, this is a single-file query — the name kept
 * historical signature to avoid downstream churn, but the body only ever
 * indexed [0]. A future version should either iterate or accept a single
 * `path: string`.
 */
export async function fetchCommitHistory(
  metadata: PRMetadata,
  filePaths: string[],
): Promise<CommitHistory[]> {
  const commits: CommitHistory[] = [];
  if (filePaths.length === 0) return commits;
  try {
    const { data } = await octokit.rest.repos.listCommits({
      owner: metadata.owner,
      repo: metadata.repo,
      per_page: 50,
      path: filePaths[0],
    });

    for (const commit of data) {
      commits.push({
        sha: commit.sha,
        author: commit.commit.author?.name || "unknown",
        message: commit.commit.message.split("\n")[0],
        date: new Date(commit.commit.author?.date || Date.now()),
        additions: 0,
        deletions: 0,
        filesTouched: [],
      });
    }
  } catch {
    /* ignore history failures */
  }

  return commits;
}

export async function computeCodeOwnership(
  metadata: PRMetadata,
  filePaths: string[],
): Promise<FileOwnership[]> {
  // Was a sequential for-loop, costing ~10× extra wall-clock on the
  // listCommits round-trips. The per-file work is independent — run in
  // parallel and let GitHub's own concurrency budget handle the rest.
  const tasks = filePaths.slice(0, 10).map(async (filename) => {
    try {
      const { data } = await octokit.rest.repos.listCommits({
        owner: metadata.owner,
        repo: metadata.repo,
        per_page: 20,
        path: filename,
      });

      const authorStats: Record<string, number> = {};
      let totalCommits = 0;
      for (const commit of data) {
        const author = commit.commit.author?.name || "unknown";
        authorStats[author] = (authorStats[author] || 0) + 1;
        totalCommits++;
      }

      const authorContributions = Object.entries(authorStats)
        .map(([author, count]) => ({
          author,
          linesAdded: 0,
          percentage: totalCommits > 0 ? (count / totalCommits) * 100 : 0,
        }))
        .sort((a, b) => b.percentage - a.percentage);

      const entry: FileOwnership = {
        filename,
        authorContributions,
        truckFactor: authorContributions.filter((a) => a.percentage > 10)
          .length,
        entropy: 0,
      };
      return entry;
    } catch {
      return null;
    }
  });

  const results = await Promise.all(tasks);
  return results.filter((r): r is FileOwnership => r !== null);
}

function truncatePatch(patch: string, budget: number = 15000): string {
  if (patch.length <= budget) return patch;
  return (
    patch.slice(0, budget) + "\n\n... [TRUNCATED FOR ENGINE PERFORMANCE] ..."
  );
}

export async function ingestAndPreprocessPR(
  prUrl: string,
): Promise<EnrichedPR> {
  const { metadata, diffs: rawDiffs } = await fetchPRDiff(prUrl);

  // Apply Token Budgeting: limit each file to 15k chars and total budget to 100k
  let totalUsage = 0;
  const GLOBAL_BUDGET = 100000;

  const diffs = rawDiffs.map((d) => {
    const budgetRemaining = GLOBAL_BUDGET - totalUsage;
    const fileBudget = Math.min(15000, budgetRemaining);
    const truncated = truncatePatch(d.patch, fileBudget);
    totalUsage += truncated.length;
    return { ...d, patch: truncated };
  });

  const filePaths = diffs.map((d) => d.filename);

  const [linkedIssues, commitHistory, codeOwnership] = await Promise.all([
    extractIssueReferences(metadata, metadata.body),
    fetchCommitHistory(metadata, filePaths),
    computeCodeOwnership(metadata, filePaths),
  ]);

  // Identify top 10 files by churn for semantic analysis to save API quota
  const topChurnFiles = [...diffs]
    .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
    .slice(0, 10)
    .map((d) => d.filename);

  // Bound concurrency to avoid hitting GitHub's secondary rate limits on
  // large PRs. Per file we make up to 2 getContent calls (before + after),
  // so 5 concurrent files = up to 10 in-flight GitHub requests.
  const AST_DIFF_CONCURRENCY = 5;
  const emptyAstDiff = (diff: FileDiff): ASTDiff => ({
    filename: diff.filename,
    beforeSymbols: [],
    afterSymbols: [],
    addedSymbols: [],
    removedSymbols: [],
    changedSymbols: [],
    addedImports: [],
    removedImports: [],
    semanticChange:
      diff.status === "added"
        ? "additive"
        : diff.status === "deleted"
          ? "breaking"
          : "none",
  });

  const astDiffs: ASTDiff[] = new Array(diffs.length);
  let nextIdx = 0;
  await Promise.all(
    Array.from({ length: Math.min(AST_DIFF_CONCURRENCY, diffs.length) }, () =>
      (async () => {
        while (true) {
          const i = nextIdx++;
          if (i >= diffs.length) return;
          const diff = diffs[i];
          try {
            const isSupported = /\.(ts|tsx|js|jsx)$/.test(diff.filename);
            const isTopChurn = topChurnFiles.includes(diff.filename);
            if (!isSupported || !isTopChurn) {
              astDiffs[i] = emptyAstDiff(diff);
              continue;
            }
            const [{ data: beforeData }, { data: afterData }] =
              await Promise.all([
                octokit.rest.repos
                  .getContent({
                    owner: metadata.owner,
                    repo: metadata.repo,
                    path: diff.previousFilename || diff.filename,
                    ref: metadata.baseSha,
                  })
                  .catch(() => ({ data: { content: "" } })),
                octokit.rest.repos
                  .getContent({
                    owner: metadata.owner,
                    repo: metadata.repo,
                    path: diff.filename,
                    ref: metadata.headSha,
                  })
                  .catch(() => ({ data: { content: "" } })),
              ]);

            const beforeCode =
              "content" in beforeData
                ? Buffer.from(beforeData.content, "base64").toString("utf-8")
                : "";
            const afterCode =
              "content" in afterData
                ? Buffer.from(afterData.content, "base64").toString("utf-8")
                : "";

            // Attach full content to the diff for layer 1 to consume.
            diff.fullContent = afterCode;
            astDiffs[i] = generateASTDiff(diff.filename, beforeCode, afterCode);
          } catch {
            astDiffs[i] = { ...emptyAstDiff(diff), semanticChange: "none" };
          }
        }
      })(),
    ),
  );

  return {
    metadata,
    diffs,
    astDiffs,
    linkedIssues,
    commitHistory,
    codeOwnership,
    processedAt: new Date(),
  };
}
