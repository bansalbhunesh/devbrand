import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getWrappedStats } from "@/rpc.server";
import { 
  Trophy, Zap, BarChart3, Rocket, Star, 
  ArrowRight, Share2, Twitter, Linkedin, 
  Github, LayoutGrid, Calendar, ChevronRight, ChevronLeft, Sparkles, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/wrapped")({
  component: WrappedPage,
});

function WrappedPage() {
  const { session } = Route.useRouteContext() as { session: any };
  const [slide, setSlide] = React.useState(0);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["wrapped", session?.id],
    queryFn: async () => {
      const res = await getWrappedStats();
      return res as any;
    },
    enabled: !!session?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#050505]">
        <div className="flex flex-col items-center gap-6">
          <div className="h-16 w-16 rounded-full border-t-2 border-blue-500 animate-spin" />
          <span className="text-[10px] font-black tracking-[0.4em] text-muted-foreground uppercase">Reconstructing your technical year...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#050505] p-6">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-black mb-4 tracking-tighter">Nothing to wrap.</h1>
          <p className="text-muted-foreground mb-8 font-medium">Start using DevBrand today to capture your impact for next year's recap.</p>
          <Link to="/dashboard" className="px-8 py-4 rounded-2xl bg-white text-black font-black text-sm hover:brightness-90 transition inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const nextSlide = () => setSlide(s => Math.min(s + 1, 5));
  const prevSlide = () => setSlide(s => Math.max(s - 1, 0));

  const slides = [
    // Slide 0: Intro
    <div key="slide-0" className="text-center space-y-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-500 text-[10px] font-black tracking-[0.3em] uppercase mb-6"
      >
        <Trophy className="h-3.5 w-3.5" /> Annual Impact Review
      </motion.div>
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-7xl md:text-[10rem] font-black tracking-tighter leading-none"
      >
        {stats.year}<br />
        <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent italic">Wrapped</span>
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xl text-muted-foreground font-medium"
      >
        A technical post-mortem of your {stats.year} contributions.
      </motion.p>
    </div>,

    // Slide 1: Volume
    <div key="slide-1" className="grid md:grid-cols-2 gap-12 items-center">
      <div className="space-y-6">
        <span className="text-sm font-black uppercase tracking-[0.4em] text-blue-500">The Output</span>
        <h2 className="text-6xl font-black tracking-tight leading-tight">
          You shipped <span className="text-blue-500">{stats.totalPRs}</span> Pull Requests.
        </h2>
        <p className="text-lg text-muted-foreground font-medium">
          That's an average of {(stats.totalPRs / 12).toFixed(1)} major architectural signals per month.
        </p>
      </div>
      <div className="relative aspect-square rounded-[3rem] bg-blue-500/5 border border-blue-500/10 grid place-items-center overflow-hidden group">
         <div className="absolute inset-0 bg-grid-small opacity-20" />
         <motion.div 
           animate={{ rotate: 360 }}
           transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
           className="absolute inset-0 opacity-[0.03] flex items-center justify-center"
         >
           <LayoutGrid className="h-80 w-80" />
         </motion.div>
         <div className="text-9xl font-black text-blue-500 group-hover:scale-110 transition-transform duration-700">{stats.totalPRs}</div>
      </div>
    </div>,

    // Slide 2: Quality
    <div key="slide-2" className="grid md:grid-cols-2 gap-12 items-center">
      <div className="relative aspect-square rounded-[3rem] bg-purple-500/5 border border-purple-500/10 grid place-items-center">
         <div className="absolute inset-0 bg-grid-small opacity-20" />
         <div className="text-9xl font-black text-purple-500 italic">#{stats.avgImpactScore}</div>
      </div>
      <div className="space-y-6">
        <span className="text-sm font-black uppercase tracking-[0.4em] text-purple-500">The Quality</span>
        <h2 className="text-6xl font-black tracking-tight leading-tight">
          Your Average ArchScore™ was Z-Tier.
        </h2>
        <p className="text-lg text-muted-foreground font-medium">
          Consistent technical depth across all branches. You don't just ship; you architect.
        </p>
      </div>
    </div>,

    // Slide 3: Stealth
    <div key="slide-3" className="space-y-12 max-w-2xl mx-auto text-center">
      <div className="space-y-4">
        <span className="text-sm font-black uppercase tracking-[0.4em] text-yellow-500">Invisible Impact</span>
        <h2 className="text-6xl font-black tracking-tight leading-tight">
          {stats.invisibleWorkPct}% of your work was "Invisible."
        </h2>
      </div>
      <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${stats.invisibleWorkPct}%` }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className="h-full bg-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)]"
        />
      </div>
      <p className="text-lg text-muted-foreground font-medium italic">
        Refactoring, tech debt elimination, and core infrastructure upgrades that typical git metrics miss.
      </p>
    </div>,

    // Slide 4: Stack
    <div key="slide-4" className="space-y-12 text-center">
      <span className="text-sm font-black uppercase tracking-[0.4em] text-muted-foreground">Tech Fingerprint</span>
      <div className="flex flex-wrap justify-center gap-4">
        {stats.topStack.map((stack: string, i: number) => (
          <motion.div 
            key={stack}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="px-10 py-6 rounded-3xl border border-white/10 bg-white/5 text-2xl font-black tracking-tighter hover:bg-white/10 transition-colors"
          >
            {stack}
          </motion.div>
        ))}
      </div>
      <p className="text-muted-foreground font-medium">Your primary levers for engineering change in {stats.year}.</p>
    </div>,

    // Slide 5: Final Card
    <div key="slide-5" className="text-center space-y-12">
      <div className="p-12 md:p-16 rounded-[4rem] border border-white/10 bg-white/5 backdrop-blur-3xl relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
           <Sparkles className="h-40 w-40" />
         </div>
         <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-8 block">Official {stats.year} Engineering Record</span>
         <h2 className="text-5xl font-black mb-12 tracking-tighter italic">Verified Strategist</h2>
         <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">PRs</div>
              <div className="text-3xl font-black">{stats.totalPRs}</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">ArchScore</div>
              <div className="text-3xl font-black">{stats.avgImpactScore}</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Stealth</div>
              <div className="text-3xl font-black">{stats.invisibleWorkPct}%</div>
            </div>
         </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
         <button className="flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-black font-black text-sm hover:brightness-90 transition shadow-2xl shadow-white/10 active:scale-95">
           <Twitter className="h-5 w-5" /> Broadcast Year
         </button>
         <button className="flex items-center gap-3 px-10 py-5 rounded-2xl bg-[#0077b5] text-white font-black text-sm hover:brightness-110 transition shadow-2xl shadow-blue-500/20 active:scale-95">
           <Linkedin className="h-5 w-5" /> Post Impact
         </button>
      </div>

      <Link to="/dashboard" className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2">
         Start {stats.year + 1} with DevBrand <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 overflow-hidden relative flex items-center justify-center">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="max-w-6xl w-full px-6 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div 
            key={slide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: "circOut" }}
            className="w-full"
          >
            {slides[slide]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="absolute bottom-12 left-0 right-0 px-12 flex items-center justify-between pointer-events-none">
         <button 
           onClick={prevSlide} 
           disabled={slide === 0}
           className="p-4 rounded-2xl border border-white/5 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all pointer-events-auto disabled:opacity-0 active:scale-90"
         >
           <ChevronLeft className="h-6 w-6" />
         </button>

         <div className="flex gap-2">
            {slides.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i === slide ? "w-8 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "w-2 bg-white/10"
                )} 
              />
            ))}
         </div>

         <button 
           onClick={nextSlide} 
           disabled={slide === slides.length - 1}
           className="p-4 rounded-2xl border border-white/5 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all pointer-events-auto disabled:opacity-0 active:scale-90"
         >
           <ChevronRight className="h-6 w-6" />
         </button>
      </div>

      <header className="absolute top-12 left-12 flex items-center gap-3">
         <Link to="/" className="h-10 w-10 rounded-xl bg-white text-black grid place-items-center shadow-2xl hover:scale-110 transition-transform">
           <Sparkles className="h-5 w-5" />
         </Link>
         <div className="flex flex-col">
           <span className="text-xs font-black tracking-tighter">DevBrand</span>
           <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Verified Recaps</span>
         </div>
      </header>

      <div className="absolute top-12 right-12 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40">
         <ShieldCheck className="h-3.5 w-3.5" /> Immutable Engineering Signal
      </div>
    </div>
  );
}
