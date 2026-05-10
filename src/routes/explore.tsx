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
    const [feed, topRoasts] = await Promise.all([
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
      })
    ]);
    return { feed, topRoasts };
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

          {/* Roast Sidebar */}
          <div className="space-y-8">
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
                <div className="p-8 rounded-xl border border-border bg-surface/10 text-center opacity-50">
                  <p className="text-[10px] font-bold uppercase tracking-widest">No roast victims yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
