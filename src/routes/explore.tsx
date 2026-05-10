import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/server/db";
import { outputs, users, roasts } from "@/server/schema";
import { eq, desc, and } from "drizzle-orm";
import { Compass, Sparkles, TrendingUp, ArrowUpRight, Zap, ExternalLink, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const getPublicFeed = createServerFn({ method: "GET" })
  .handler(async () => {
    const [feed, topRoasts, topEngineers] = await Promise.all([
      db.query.outputs.findMany({
        where: eq(outputs.isPublic, true),
        orderBy: [desc(outputs.createdAt)],
        limit: 30,
        with: { user: true }
      }),
      db.query.roasts.findMany({
        where: eq(roasts.isPublic, true),
        orderBy: [desc(roasts.createdAt)],
        limit: 10,
      }),
      db.query.users.findMany({
        limit: 5,
        with: { outputs: true }
      })
    ]);

    // Rank engineers by total impact score
    const rankedEngineers = topEngineers
      .map(u => ({
        ...u,
        totalImpact: u.outputs.reduce((s, o) => s + o.impactScore, 0),
        avgImpact: Math.round(u.outputs.reduce((s, o) => s + o.impactScore, 0) / (u.outputs.length || 1))
      }))
      .sort((a, b) => b.totalImpact - a.totalImpact);

    return { feed, topRoasts, topEngineers: rankedEngineers };
  });


export const Route = createFileRoute("/explore")({
  component: ExplorePage,
});

function ExplorePage() {
  const { data: feed, isLoading } = useQuery({
    queryKey: ["explore-feed"],
    queryFn: () => getPublicFeed(),
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue/10 text-blue text-[10px] font-bold uppercase tracking-widest mb-4">
              <Compass className="h-3 w-3" /> Explore Impact
            </div>
            <h1 className="text-4xl font-bold tracking-tight">The Evidence Feed</h1>
            <p className="text-muted-foreground mt-2">Real engineering transformations, verified by Git.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
          {/* Impact Feed */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-blue" /> Latest Transformations
            </h2>
            
            {!feed?.feed?.length && !isLoading ? (
              <div className="p-12 rounded-2xl border border-dashed border-border bg-surface/10 text-center">
                <Compass className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-bold">No transformations yet</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                  Be the first to turn a complex PR into verifiable career leverage.
                </p>
                <Link to="/" className="inline-flex mt-6 px-6 py-2 rounded-full bg-blue text-white font-bold text-xs">
                  Generate First Impact
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {feed?.feed.map((item) => (
                  <Link 
                    key={item.id} 
                    to="/t/$slug" 
                    params={{ slug: item.slug }}
                    className="group relative flex flex-col p-6 rounded-2xl border border-border bg-surface/30 hover:border-blue/50 hover:bg-surface/50 transition duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <img src={item.user?.avatarUrl ?? ""} className="h-5 w-5 rounded-md" alt="" />
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{item.user?.githubLogin}</span>
                      </div>
                      <div className="px-2 py-0.5 rounded-md bg-blue/10 text-blue text-[9px] font-bold uppercase tracking-widest">
                        {item.impactScore}
                      </div>
                    </div>
                    <h3 className="font-bold text-base mb-2 line-clamp-1 leading-snug group-hover:text-blue transition">
                      {item.prTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed italic">
                      "{item.linkedinPost1.slice(0, 100)}..."
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                      <div className="flex gap-1">
                        {item.stack?.slice(0, 2).map(s => (
                          <span key={s} className="text-[8px] font-mono px-1 rounded-md bg-border/50 uppercase">
                            {s}
                          </span>
                        ))}
                      </div>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebars */}
          <div className="space-y-12">
            {/* Leaderboard */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue" /> Top Engineers
              </h2>
              <div className="space-y-3">
                {feed?.topEngineers?.map((eng, i) => (
                  <Link key={eng.id} to="/u/$login" params={{ login: eng.githubLogin }} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/20 hover:bg-surface/40 transition group">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded bg-muted grid place-items-center text-[10px] font-bold text-muted-foreground group-hover:text-blue group-hover:bg-blue/10 transition">
                        {i + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        <img src={eng.avatarUrl ?? ""} className="h-6 w-6 rounded shadow-sm" alt="" />
                        <span className="text-xs font-bold truncate max-w-[80px]">{eng.githubLogin}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-blue tracking-tighter">{eng.avgImpact}%</div>
                      <div className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">Avg Impact</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Roast Sidebar */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-500" /> Recent Roasts
              </h2>

            <div className="space-y-4">
              {feed?.topRoasts?.length ? feed.topRoasts.map((roast) => (
                <Link key={roast.id} to="/r/$id" params={{ id: roast.id }} className="block p-4 rounded-xl border border-border bg-surface/20 hover:border-red-500/50 transition">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">@{roast.githubUsername}</span>
                    <span className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-tighter",
                      roast.roastData.criticality === "NUCLEAR" ? "bg-red-500 text-white border-red-500" : "text-red-500 border-red-500/30"
                    )}>
                      {roast.roastData.criticality}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground leading-relaxed italic line-clamp-3 mb-2">
                    "{roast.roastData.roast}"
                  </p>
                  <div className="text-[9px] text-muted-foreground font-mono">Score: {roast.roastData.roast_score}/100</div>
                </Link>
              )) : (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-4 px-2">Featured Sacrifices</p>
                  {[
                    { name: "torvalds", score: 99, crit: "NUCLEAR", roast: "Your code is the reason C programmers have night terrors. You built Linux out of pure spite and it shows in every single goto statement." },
                    { name: "gaearon", score: 82, crit: "HIGH", roast: "You've deprecated more libraries than I've written lines of code. Your hooks have more side effects than a prescription drug commercial." },
                    { name: "tj", score: 94, crit: "NUCLEAR", roast: "You write frameworks faster than the NPM registry can index them. I'm convinced you're actually a very complex shell script." }
                  ].map((f) => (
                    <div key={f.name} className="block p-4 rounded-xl border border-border bg-surface/10 opacity-60">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">@{f.name}</span>
                        <span className={cn(
                          "text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-tighter",
                          f.crit === "NUCLEAR" ? "bg-red-500/20 text-red-500 border-red-500/30" : "text-red-500 border-red-500/30"
                        )}>
                          {f.crit}
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground/50 leading-relaxed italic line-clamp-3 mb-2">
                        "{f.roast}"
                      </p>
                      <div className="text-[9px] text-muted-foreground/30 font-mono">Score: {f.score}/100</div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
