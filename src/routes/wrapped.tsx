import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getWrappedStats } from "@/server/wrapped";
import { getSession } from "@/server/auth";
import { 
  Trophy, Zap, BarChart3, Rocket, Star, 
  ArrowRight, Share2, Twitter, Linkedin, 
  Github, LayoutGrid, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wrapped")({
  component: WrappedPage,
});

function WrappedPage() {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["wrapped", session?.id],
    queryFn: () => getWrappedStats({ data: session?.id! }),
    enabled: !!session?.id,
  });


  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-t-2 border-blue animate-spin" />
          <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Reconstructing your year...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen grid place-items-center bg-black p-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold mb-4">No PRs found for {new Date().getFullYear() - 1}</h1>
          <p className="text-muted-foreground mb-8">Start using DevBrand today to capture your impact for next year's Wrapped.</p>
          <Link to="/dashboard" className="px-6 py-3 rounded-full bg-blue text-white font-bold hover:brightness-110 transition inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const shareText = `My ${stats.year} Engineering Wrapped on DevBrand: ${stats.totalPRs} PRs analyzed, ${stats.avgImpactScore} Avg. Impact Score! #DevBrandWrapped`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent("https://devbrand.ai/wrapped")}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://devbrand.ai/wrapped")}`;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue/30 selection:text-blue-200 overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple/10 blur-[150px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 py-24">
        {/* Intro */}
        <header className="text-center mb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue/20 bg-blue/5 text-blue text-[10px] font-bold uppercase tracking-widest mb-6">
            <Trophy className="h-3 w-3" /> Annual Review
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8">
            {stats.year} <span className="bg-gradient-to-r from-blue to-purple bg-clip-text text-transparent">Wrapped</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            A technical post-mortem of your contributions, architectural impact, and invisible wins.
          </p>
        </header>

        {/* Big Numbers */}
        <div className="grid md:grid-cols-2 gap-12 mb-32">
          <div className="group relative p-12 rounded-[2rem] border border-white/5 bg-white/5 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-left-8 duration-700 delay-200">
            <div className="absolute inset-0 bg-gradient-to-br from-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500" />
            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 block">Engineered Impact</span>
            <div className="text-7xl font-black mb-2">{stats.totalPRs}</div>
            <p className="text-muted-foreground">Pull Requests analyzed across {stats.topStack.length} languages.</p>
            <LayoutGrid className="absolute bottom-[-20%] right-[-10%] h-48 w-48 text-blue/10 rotate-12" />
          </div>

          <div className="group relative p-12 rounded-[2rem] border border-white/5 bg-white/5 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-right-8 duration-700 delay-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500" />
            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 block">ArchScore™ Consistency</span>
            <div className="text-7xl font-black mb-2">{stats.avgImpactScore}</div>
            <p className="text-muted-foreground">Average architectural significance per change.</p>
            <BarChart3 className="absolute bottom-[-20%] right-[-10%] h-48 w-48 text-purple/10 -rotate-12" />
          </div>
        </div>

        {/* Invisible Work */}
        <div className="relative p-12 rounded-[2.5rem] border border-white/5 bg-white/5 backdrop-blur-xl mb-32 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
           <div className="absolute top-0 right-0 p-12">
            <Zap className="h-12 w-12 text-yellow-500/30" />
          </div>
          <div className="max-w-xl">
            <span className="text-sm font-bold uppercase tracking-widest text-yellow-500 mb-4 block">The "Invisible" Win</span>
            <h2 className="text-4xl font-bold mb-6">
              {stats.invisibleWorkPct}% of your work was structural.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              You spent significant energy on refactoring, tech debt, and behavior-preserving architectural upgrades that typical tools miss.
            </p>
            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <div 
                className="h-full bg-yellow-500 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.5)]" 
                style={{ width: `${stats.invisibleWorkPct}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="grid md:grid-cols-3 gap-6 mb-32">
          {stats.categoryBreakdown.slice(0, 3).map(([cat, count], i) => (
            <div key={cat} className="p-8 rounded-[1.5rem] border border-white/5 bg-white/5 animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${500 + (i * 100)}ms` }}>
              <div className="text-3xl font-bold mb-2">{count}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{cat}</div>
            </div>
          ))}
        </div>

        {/* Share Section */}
        <div className="text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-800">
          <h3 className="text-2xl font-bold mb-8">Make your impact public.</h3>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a 
              href={twitterUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-bold hover:brightness-90 transition"
            >
              <Twitter className="h-5 w-5" /> Share on X
            </a>
            <a 
              href={linkedinUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-3 px-8 py-4 rounded-full border border-white/10 bg-white/5 font-bold hover:bg-white/10 transition"
            >
              <Linkedin className="h-5 w-5" /> LinkedIn
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-12 flex items-center justify-center gap-2">
            <Github className="h-3 w-3" /> Built with DevBrand. Verified by Git log.
          </p>
        </div>
      </div>
    </div>
  );
}
