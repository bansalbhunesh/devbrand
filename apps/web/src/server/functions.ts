import { createServerFn } from "@tanstack/react-start";
import { getRequestHost, getRequestProtocol, getRequestIP, getCookie, setCookie } from "@tanstack/react-start/server";
import { completeText, getRateLimiter } from "@devbrand/ai-sdk";

export const getAuthState = createServerFn({ method: "GET" }).handler(async () => {
  return { isLoggedIn: !!getCookie("gh_token") };
});

export const getAuthUrl = createServerFn({ method: "GET" }).handler(async () => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) throw new Error("GITHUB_CLIENT_ID is not configured");
  
  const host = getRequestHost() || "localhost:3000";
  const proto = getRequestProtocol() || "http";
  const redirectUri = `${proto}://${host}/`;
  
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo`;
});

export const exchangeAuthCode = createServerFn({ method: "POST" })
  .validator((code: string) => code)
  .handler(async ({ data: code }) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("OAuth credentials not configured");

    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    
    const tokenData = await res.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
    
    setCookie("gh_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return { success: true };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  setCookie("gh_token", "", { maxAge: 0, path: "/" });
  return { success: true };
});

export const generatePost = createServerFn({ method: "POST" })
  .validator((input: { prUrl: string; voiceSample?: string }) => input)
  .handler(async ({ data: { prUrl, voiceSample } }) => {
    const ip = getRequestIP() || "127.0.0.1";
    
    const limiter = getRateLimiter();
    const { success } = await limiter.limit(ip);
    if (!success) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    if (!prUrl) throw new Error("Missing prUrl");

    const match = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
    if (!match) throw new Error("Invalid GitHub PR URL. Must be like https://github.com/owner/repo/pull/123");
    const [, owner, repo, prNumber] = match;

    const userToken = getCookie("gh_token");
    const prApiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
    const headers: any = { "User-Agent": "DevBrand-App" };
    const tokenToUse = userToken || process.env.GITHUB_TOKEN;
    if (tokenToUse) headers["Authorization"] = `Bearer ${tokenToUse}`;

    const prRes = await fetch(prApiUrl, { headers });
    if (!prRes.ok) throw new Error("Failed to fetch PR from GitHub");
    const prData = await prRes.json();

    const diffRes = await fetch(prApiUrl, {
      headers: { ...headers, Accept: "application/vnd.github.v3.diff" },
    });
    const prDiff = await diffRes.text();

    const brutalTruthRes = await completeText({
      promptKey: "pr.brutal_truth",
      variables: [prData.title, prData.body || "", prDiff],
    });
    
    const linkedInSpinRes = await completeText({
      promptKey: "pr.linkedin_spin",
      variables: [prData.title, brutalTruthRes.text, voiceSample],
    });

    return {
      brutalTruth: brutalTruthRes.text,
      linkedInSpin: linkedInSpinRes.text,
    };
  });
