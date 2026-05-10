import { Octokit } from "octokit";
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

export async function parsePRUrl(prUrl: string): Promise<{ owner: string; repo: string; prNumber: number }> {
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

  const { data: pr } = await octokit.rest.pulls.get({ owner, repo, pull_number: prNumber });

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
    owner, repo, pull_number: prNumber, per_page: 300
  });

  const BINARY_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.exe', '.bin', '.zip', '.tar', '.gz'];

  const diffs: FileDiff[] = files
    .filter(file => {
      const isBinary = BINARY_EXTENSIONS.some(ext => file.filename.toLowerCase().endsWith(ext));
      const hasPatch = !!file.patch;
      return !isBinary && hasPatch;
    })
    .map((file) => ({
      filename: file.filename,
      status: file.status as FileDiff['status'],
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch || "",
      previousFilename: file.previous_filename || undefined,
    }));

  if (diffs.length === 0 && files.length > 0) {
    // If we filtered out everything (e.g. only images), provide a minimal stub to avoid crashing
    diffs.push({
      filename: files[0].filename,
      status: files[0].status as FileDiff['status'],
      additions: files[0].additions,
      deletions: files[0].deletions,
      patch: "// [BINARY OR NON-TEXTUAL CHANGE]",
    });
  }

  return { metadata, diffs };
}


export function extractSymbols(code: string, filename: string): ASTSymbol[] {
  const symbols: ASTSymbol[] = [];
  const patterns = [
    /export\s+(?:async\s+)?function\s+(\w+)/g,
    /export\s+(?:async\s+)?(?:const|let|var)\s+(\w+)/g,
    /export\s+class\s+(\w+)/g,
    /export\s+interface\s+(\w+)/g,
    /export\s+type\s+(\w+)/g,
    /export\s+default/g,
  ];

  const kindMap: Record<string, ASTSymbol['kind']> = {
    function: "function",
    const: "const",
    class: "class",
    interface: "interface",
    type: "type",
  };

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const name = match[1] || "default";
      const startLine = code.substring(0, match.index).split("\n").length;
      symbols.push({
        name,
        kind: kindMap[pattern.source.match(/function|const|class|interface|type/)?.[0] || "variable"] || "variable",
        startLine,
        endLine: startLine + 10, 
        isExported: true,
      });
    }
  }

  return symbols;
}

export function generateASTDiff(
  filename: string,
  beforeCode: string,
  afterCode: string
): ASTDiff {
  const beforeSymbols = extractSymbols(beforeCode, filename);
  const afterSymbols = extractSymbols(afterCode, filename);

  const beforeNames = new Set(beforeSymbols.map((s) => s.name));
  const afterNames = new Set(afterSymbols.map((s) => s.name));

  const addedSymbols = afterSymbols.filter((s) => !beforeNames.has(s.name));
  const removedSymbols = beforeSymbols.filter((s) => !afterNames.has(s.name));
  const changedSymbols = afterSymbols.filter(
    (s) => beforeNames.has(s.name) && !addedSymbols.includes(s)
  );

  const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
  const beforeImports = [...beforeCode.matchAll(importRegex)].map((m) => m[1]);
  const afterImports = [...afterCode.matchAll(importRegex)].map((m) => m[1]);

  const addedImports = afterImports.filter((i) => !beforeImports.includes(i));
  const removedImports = beforeImports.filter((i) => !afterImports.includes(i));

  let semanticChange: ASTDiff['semanticChange'] = 'none';
  if (removedSymbols.some((s) => s.isExported)) {
    semanticChange = 'breaking';
  } else if (addedImports.length > 0 || removedImports.length > 0) {
    semanticChange = 'additive';
  } else if (
    addedSymbols.length > 0 &&
    removedSymbols.length > 0 &&
    afterSymbols.length === beforeSymbols.length
  ) {
    semanticChange = 'refactor';
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
  prBody: string
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
        const labels = data.labels.map((l) => typeof l === 'string' ? l : l.name || "");
        issues.push({
          number: issueNumber,
          title: data.title,
          labels,
          type: "unknown",
          url: data.html_url,
        });
      }
    } catch {}
  }

  return issues;
}

export async function fetchCommitHistory(
  metadata: PRMetadata,
  filePaths: string[]
): Promise<CommitHistory[]> {
  const commits: CommitHistory[] = [];
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
  } catch {}

  return commits;
}

export async function computeCodeOwnership(
  metadata: PRMetadata,
  filePaths: string[]
): Promise<FileOwnership[]> {
  const ownership: FileOwnership[] = [];
  for (const filename of filePaths.slice(0, 10)) {
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

      ownership.push({
        filename,
        authorContributions,
        truckFactor: authorContributions.filter((a) => a.percentage > 10).length,
        entropy: 0, 
      });
    } catch {}
  }

  return ownership;
}

function truncatePatch(patch: string, budget: number = 15000): string {
  if (patch.length <= budget) return patch;
  return patch.slice(0, budget) + "\n\n... [TRUNCATED FOR ENGINE PERFORMANCE] ...";
}

export async function ingestAndPreprocessPR(prUrl: string): Promise<EnrichedPR> {
  const { metadata, diffs: rawDiffs } = await fetchPRDiff(prUrl);
  
  // Apply Token Budgeting: limit each file to 15k chars and total budget to 100k
  let totalUsage = 0;
  const GLOBAL_BUDGET = 100000;
  
  const diffs = rawDiffs.map(d => {
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
    .sort((a, b) => (b.additions + b.deletions) - (a.additions + a.deletions))
    .slice(0, 10)
    .map(d => d.filename);

  const astDiffs: ASTDiff[] = await Promise.all(diffs.map(async (diff) => {
    try {
      // Fetch "before" and "after" content for semantic analysis
      // Note: We only do this for supported file types AND top churn files to save tokens/API calls
      const isSupported = /\.(ts|tsx|js|jsx)$/.test(diff.filename);
      const isTopChurn = topChurnFiles.includes(diff.filename);
      
      if (!isSupported || !isTopChurn) {

        return {
          filename: diff.filename,
          beforeSymbols: [],
          afterSymbols: [],
          addedSymbols: [],
          removedSymbols: [],
          changedSymbols: [],
          addedImports: [],
          removedImports: [],
          semanticChange: diff.status === 'added' ? 'additive' :
                          diff.status === 'deleted' ? 'breaking' : 'none',
        };
      }

      const [{ data: beforeData }, { data: afterData }] = await Promise.all([
        octokit.rest.repos.getContent({
          owner: metadata.owner,
          repo: metadata.repo,
          path: diff.previousFilename || diff.filename,
          ref: metadata.baseSha,
        }).catch(() => ({ data: { content: "" } })),
        octokit.rest.repos.getContent({
          owner: metadata.owner,
          repo: metadata.repo,
          path: diff.filename,
          ref: metadata.headSha,
        }).catch(() => ({ data: { content: "" } })),
      ]);

      const beforeCode = "content" in beforeData ? Buffer.from(beforeData.content, "base64").toString("utf-8") : "";
      const afterCode = "content" in afterData ? Buffer.from(afterData.content, "base64").toString("utf-8") : "";

      // Attach full content to the diff for later static analysis (Layer 1)
      diff.fullContent = afterCode;

      return generateASTDiff(diff.filename, beforeCode, afterCode);

    } catch (err) {
      return {
        filename: diff.filename,
        beforeSymbols: [],
        afterSymbols: [],
        addedSymbols: [],
        removedSymbols: [],
        changedSymbols: [],
        addedImports: [],
        removedImports: [],
        semanticChange: 'none',
      };
    }
  }));


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

