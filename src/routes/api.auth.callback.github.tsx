import { createFileRoute, redirect } from "@tanstack/react-router";
import { handleGithubCallback } from "@/rpc.server";

export const Route = createFileRoute("/api/auth/callback/github")({
  loader: async ({ location }) => {
    let url: URL;
    try {
      url = new URL(location.href);
    } catch {
      throw redirect({ to: "/", search: { auth: "invalid_url" } });
    }
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state") ?? undefined;
    const err = url.searchParams.get("error");

    if (err) {
      throw redirect({ to: "/", search: { auth: err } });
    }
    if (!code) {
      throw redirect({ to: "/", search: { auth: "missing_code" } });
    }

    try {
      await handleGithubCallback({ data: { code, state } });
    } catch {
      throw redirect({ to: "/", search: { auth: "failed" } });
    }

    throw redirect({ to: "/dashboard" });
  },
  component: () => (
    <div className="min-h-[40vh] grid place-items-center text-sm text-muted-foreground">
      Completing sign-in…
    </div>
  ),
});
