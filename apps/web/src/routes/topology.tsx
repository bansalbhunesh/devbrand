import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, Shield, Zap, Cpu } from "lucide-react";

export const Route = createFileRoute("/topology")({
  component: TopologyPage,
});

function TopologyPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Background Cinematic Simulation */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,100,255,0.1),transparent_70%)]" />
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 border border-white/5" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-24 h-screen flex flex-col">
        <header className="flex justify-between items-end mb-12">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mb-4">
              <Activity className="h-3 w-3" />
              System Status: Operational
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">
              Distributed <span className="text-blue-500">Topology</span>
            </h1>
          </div>
          <div className="text-right font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            Last Sync: {new Date().toLocaleTimeString()}
          </div>
        </header>

        <div className="flex-1 grid md:grid-cols-3 gap-8">
          {/* Intelligence Mesh */}
          <div className="md:col-span-2 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-3xl relative overflow-hidden group">
             <div className="absolute top-6 left-6 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Intelligence Mesh</span>
             </div>
             
             {/* Simulation Placeholder - In a real app, this would be the 3D map */}
             <div className="h-full flex items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="relative h-64 w-64 rounded-full border border-blue-500/20 border-dashed"
                >
                  <div className="absolute inset-0 rounded-full bg-blue-500/5 blur-3xl" />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]" 
                  />
                </motion.div>
                <div className="absolute bottom-12 text-center">
                  <div className="text-2xl font-black tracking-widest uppercase mb-2">Live Orchestration</div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">Mapping 148 event-driven nodes</div>
                </div>
             </div>
          </div>

          {/* Metrics Panel */}
          <div className="space-y-8">
             <div className="p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-6 text-orange-500">
                  <Zap className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Latency Spectrum</span>
                </div>
                <div className="space-y-4">
                  {[42, 85, 21].map((val, i) => (
                    <div key={i}>
                       <div className="flex justify-between text-[10px] font-mono mb-1">
                          <span>Layer {i} Node</span>
                          <span>{val}ms</span>
                       </div>
                       <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${val}%` }}
                            className="h-full bg-blue-500"
                          />
                       </div>
                    </div>
                  ))}
                </div>
             </div>

             <div className="p-8 rounded-3xl border border-white/10 bg-blue-500/10 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-6 text-blue-500">
                  <Shield className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Resilience Check</span>
                </div>
                <div className="text-3xl font-black mb-2 tracking-tighter">99.98%</div>
                <div className="text-[10px] font-medium text-blue-500/70 leading-relaxed uppercase tracking-widest">
                  Automatic model failover: Active<br />
                  DLQ Status: Clear
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
