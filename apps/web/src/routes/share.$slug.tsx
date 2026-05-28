import { createFileRoute } from "@tanstack/react-router";
import { Github, Target, Flame, Share2 } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/share/$slug")({
  component: SharePage,
  loader: async ({ params }) => {
    // In the future, this will fetch from Drizzle: SELECT * FROM outputs WHERE slug = params.slug
    return {
      slug: params.slug,
      prTitle: "Refactor: Implement neural caching layer",
      impactScore: 87,
      brutalTruth: "This PR is over-engineered. You implemented a custom caching layer when a standard LRU would suffice. However, the performance gains are undeniable. Stop reinventing the wheel and just use Redis next time.",
      linkedInSpin: "🚀 Thrilled to announce a massive performance breakthrough! 🚀\n\nI just designed and implemented a bespoke neural caching layer that reduces latency by 40%. It's incredible to see the tangible impact of deep architectural thinking on user experience. \n\nAlways pushing the boundaries! 💡 #Engineering #Performance #BuildInPublic",
      authorName: "Staff Engineer",
      complexityLevel: "High"
    };
  }
});

function SharePage() {
  const data = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-[#09090b] selection:bg-amber-500/30 font-sans p-6 md:p-20 flex flex-col items-center">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/10 blur-[120px] rounded-[100%] pointer-events-none mix-blend-screen opacity-50" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl bg-zinc-900/80 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl relative"
      >
        {/* Header */}
        <div className="p-8 border-b border-zinc-800/50 bg-zinc-950/50 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Github className="w-5 h-5" />
              <span>Verified PR Impact</span>
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">{data.prTitle}</h1>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Ego Score</span>
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-3xl font-black">
              {data.impactScore}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 grid gap-8">
          <div className="space-y-4">
            <h3 className="text-sm uppercase tracking-widest text-amber-500 font-bold flex items-center gap-2">
              <Flame className="w-4 h-4" /> The Brutal Truth
            </h3>
            <p className="text-zinc-300 leading-relaxed font-mono text-sm bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
              {data.brutalTruth}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm uppercase tracking-widest text-blue-400 font-bold flex items-center gap-2">
              <Target className="w-4 h-4" /> The LinkedIn Spin
            </h3>
            <div className="text-zinc-100 leading-relaxed bg-blue-950/20 p-6 rounded-xl border border-blue-900/30 whitespace-pre-wrap">
              {data.linkedInSpin}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-zinc-950 border-t border-zinc-800/50 flex justify-between items-center">
          <div className="text-sm text-zinc-500 font-mono">
            Complexity: <span className="text-zinc-300">{data.complexityLevel}</span>
          </div>
          <button className="flex items-center gap-2 text-sm font-bold bg-zinc-100 text-zinc-900 px-4 py-2 rounded-lg hover:bg-white transition-colors">
            <Share2 className="w-4 h-4" /> Share Artifact
          </button>
        </div>
      </motion.div>
    </div>
  );
}
