import { createFileRoute, redirect } from "@tanstack/react-router";
import { handleGithubCallback } from "@/rpc";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

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
  // This component only flashes briefly between the loader resolving and the
  // browser redirecting — matters because if the redirect chain stalls (slow
  // GitHub token exchange, Neon cold start) the user sees this. Should read
  // as "we're handling it" rather than "did the page break".
  component: () => (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="flex flex-col items-center gap-8">
        <div className="relative h-20 w-20 grid place-items-center">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-blue-500/40"
            animate={{
              scale: [1, 1.4, 1.8],
              opacity: [0.5, 0.2, 0],
            }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-blue-500/40"
            animate={{
              scale: [1, 1.4, 1.8],
              opacity: [0.5, 0.2, 0],
            }}
            transition={{
              duration: 2.8,
              delay: 1.4,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          <div className="relative h-12 w-12 rounded-full bg-blue-500/10 border border-blue-500/30 grid place-items-center">
            <ShieldCheck className="h-5 w-5 text-blue-500/80" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <div className="text-sm font-bold tracking-tight">
            Verifying your GitHub identity
          </div>
          <div className="text-[10px] font-black tracking-[0.4em] text-muted-foreground uppercase">
            Securing session…
          </div>
        </div>
      </div>
    </div>
  ),
});
