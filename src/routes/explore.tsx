import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicFeed } from "@/rpc";
import {
  Compass,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  Flame,
  Trophy,
  Rocket,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
});

function ExplorePage() {
  const [tab, setTab] = React.useState<"global" | "impact" | "structural">(
    "global",
  );
  const { data: feed, isLoading } = useQuery({
    queryKey: ["explore-feed"],
    queryFn: () => getPublicFeed(),
  });

  const filteredFeed = React.useMemo(() => {
    if (!feed?.feed) return [];
    if (tab === "global") return feed.feed;
    if (tab === "impact")
      return feed.feed.filter((i) => (i.impactScore ?? 0) >= 80);
    if (tab === "structural")
      return feed.feed.filter(
        (i) =>
          i.category === "Structural" ||
          i.category === "Refactor" ||
          i.category === "Architecture",
      );
    return feed.feed;
  }, [feed, tab]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Decorative Background Blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl py-16 px-6 sm:py-24">
        <header className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
            <Compass className="h-3 w-3" /> Engineering Radar
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[0.9] mb-4">
            The Evidence <span className="text-blue-500">Feed</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl font-medium">
            Discover verifiable architectural transformations and high-impact
            engineering stories verified by DevBrand AI.
          </p>
        </header>

        <div className="flex items-center gap-8 mb-16 border-b border-border relative">
          {(["global", "impact", "structural"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "pb-4 text-[11px] font-black uppercase tracking-[0.25em] transition relative z-10",
                tab === t
                  ? "text-blue-500"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "global"
                ? "Global Stream"
                : t === "impact"
                  ? "Elite Impact"
                  : "Structural Logic"}
              {tab === t && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                />
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-16">
          {/* Impact Feed */}
          <div className="space-y-12">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-blue-500" />
                <span className="uppercase tracking-widest text-xs font-black">
                  {tab === "global"
                    ? "Latest Transformations"
                    : tab === "impact"
                      ? "Elite Performance"
                      : "Invisible Infrastructure"}
                </span>
              </h2>
              <div className="text-[10px] font-mono text-muted-foreground opacity-60">
                {filteredFeed.length} SIGNALS FOUND
              </div>
            </div>

            {!filteredFeed.length && !isLoading ? (
              <div className="py-32 rounded-[2.5rem] border-2 border-dashed border-border bg-muted/10 text-center">
                <Compass className="h-12 w-12 text-muted-foreground mx-auto mb-6 opacity-20" />
                <h3 className="text-xl font-bold mb-2">Signal Silence</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  No public engineering transformations found in this sector
                  yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AnimatePresence mode="popLayout">
                  {filteredFeed.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link
                        to="/t/$slug"
                        params={{ slug: item.slug }}
                        className="group relative flex flex-col h-full p-8 rounded-[2rem] border border-border bg-muted/20 hover:border-blue-500/50 hover:bg-muted/40 transition-all duration-500 overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-background border border-border grid place-items-center font-bold text-[10px]">
                              {item.user?.githubLogin
                                ?.slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                              {item.user?.githubLogin}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/5 text-blue-500 border border-blue-500/10 text-[10px] font-black">
                            <TrendingUp className="h-3 w-3" />{" "}
                            {item.impactScore}
                          </div>
                        </div>

                        <h3 className="font-bold text-lg mb-3 line-clamp-2 leading-tight group-hover:text-blue-500 transition-colors">
                          {item.prTitle}
                        </h3>

                        <p className="text-sm text-muted-foreground line-clamp-3 mb-8 leading-relaxed italic opacity-80">
                          "{item.linkedinPost1}"
                        </p>

                        <div className="flex items-center justify-between pt-6 border-t border-border mt-auto">
                          <div className="flex gap-2">
                            {item.stack?.slice(0, 2).map((s) => (
                              <span
                                key={s}
                                className="text-[9px] font-black px-2 py-1 rounded bg-muted-foreground/10 uppercase tracking-wider"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                          <div className="h-8 w-8 rounded-full bg-background border border-border grid place-items-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                            <ArrowUpRight className="h-4 w-4 text-blue-500" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Sidebars */}
          <div className="space-y-16">
            {/* Leaderboard */}
            <div className="space-y-8">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Trophy className="h-5 w-5 text-blue-500" />
                <span className="uppercase tracking-widest text-xs font-black">
                  Top Velocity
                </span>
              </h2>
              <div className="space-y-4">
                {feed?.topEngineers?.map((eng, i) => (
                  <Link
                    key={eng.id}
                    to="/u/$login"
                    params={{ login: eng.githubLogin }}
                    className="flex items-center justify-between p-4 rounded-2xl border border-border bg-muted/20 hover:border-blue-500/30 hover:bg-muted/40 transition group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-lg bg-background border border-border grid place-items-center text-[11px] font-black text-muted-foreground group-hover:text-blue-500 transition">
                        #{i + 1}
                      </div>
                      <div className="flex items-center gap-3">
                        <img
                          src={eng.avatarUrl ?? ""}
                          className="h-8 w-8 rounded-lg shadow-xl shadow-black/20"
                          alt=""
                        />
                        <span className="text-sm font-bold truncate max-w-[100px]">
                          {eng.githubLogin}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] font-black text-blue-500 tracking-tighter">
                        {Math.round(eng.avgImpact)}%
                      </div>
                      <div className="text-[8px] text-muted-foreground uppercase font-black tracking-widest opacity-60">
                        Avg Impact
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Roast Sidebar */}
            <div className="space-y-8">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Flame className="h-5 w-5 text-red-500" />
                <span className="uppercase tracking-widest text-xs font-black">
                  Critical Roasts
                </span>
              </h2>

              <div className="space-y-4">
                {feed?.topRoasts?.length ? (
                  feed.topRoasts.map((roast) => (
                    <Link
                      key={roast.id}
                      to="/r/$id"
                      params={{ id: roast.id }}
                      className="block p-5 rounded-2xl border border-red-500/10 bg-red-500/[0.02] hover:border-red-500/40 hover:bg-red-500/[0.05] transition-all group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                          @{roast.githubUsername}
                        </span>
                        <div
                          className={cn(
                            "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest",
                            roast.roastData.criticality === "NUCLEAR"
                              ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20"
                              : "text-red-500 border-red-500/20 bg-red-500/5",
                          )}
                        >
                          {roast.roastData.criticality}
                        </div>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed italic line-clamp-3 mb-4 font-medium">
                        "{roast.roastData.roast}"
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-mono font-bold text-red-500/60 uppercase tracking-tighter">
                          SCORE: {roast.roastData.roast_score}/100
                        </div>
                        <ArrowUpRight className="h-3 w-3 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-8 rounded-2xl border border-dashed border-border text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 leading-relaxed">
                      No public roasts found. <br /> Roast a repo to ignite the
                      feed.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Promo CTA */}
            <Link
              to="/"
              className="block p-8 rounded-[2rem] bg-foreground text-background group overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                <Rocket className="h-20 w-20" />
              </div>
              <h4 className="text-xl font-bold mb-2">Ready to land?</h4>
              <p className="text-sm font-medium opacity-80 mb-6">
                Turn your invisible PRs into verifiable career impact stories.
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest group-hover:gap-4 transition-all">
                Join DevBrand <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
