import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export interface CollabProfile {
  reviewsGiven: number;
  reviewsReceived: number;
  forceMultiplierScore: number;
  topCollaborators: string[];
}

export async function buildCollabGraph(username: string): Promise<CollabProfile> {
  // Scans PRs the user has been involved with
  // q=type:pr+reviewed-by:{username}
  
  try {
    const { data: searchResults } = await octokit.rest.search.issuesAndPullRequests({
      q: `type:pr reviewed-by:${username}`,
      per_page: 50,
    });

    const reviewsGiven = searchResults.total_count;
    
    // This is a simplified version of the logic
    // In production, we'd iterate through reviews to build the adjacency matrix
    
    return {
      reviewsGiven,
      reviewsReceived: Math.round(reviewsGiven * 0.8), // Simulated for V1
      forceMultiplierScore: Math.min(100, Math.round(reviewsGiven * 2.5)),
      topCollaborators: [],
    };
  } catch (error) {
    console.error("Error building collab graph:", error);
    return {
      reviewsGiven: 0,
      reviewsReceived: 0,
      forceMultiplierScore: 0,
      topCollaborators: [],
    };
  }
}
