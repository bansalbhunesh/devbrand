import {
  Plus,
  Users,
  TrendingUp,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TeamsTabProps {
  user: any;
  handleUpgrade: () => void;
}

export function TeamsTab({ user, handleUpgrade }: TeamsTabProps) {
  const demoTeam = [
    {
      name: "Alex Chen",
      impact: 92,
      velocity: "+12%",
      avatar: "AC",
      status: "Lead",
    },
    {
      name: "Sarah Miller",
      impact: 88,
      velocity: "+5%",
      avatar: "SM",
      status: "Senior",
    },
    {
      name: "Jamie V.",
      impact: 84,
      velocity: "+8%",
      avatar: "JV",
      status: "Member",
    },
    {
      name: "Chris P.",
      impact: 79,
      velocity: "-2%",
      avatar: "CP",
      status: "Member",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Team Intelligence
          </h2>
          <p className="text-sm text-muted-foreground">
            Compare impact velocity and sync architectural signals across your
            org.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end px-4 py-1 border-r border-border">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Team Velocity
            </span>
            <div className="flex items-center gap-1.5 text-green-500 font-bold text-sm">
              <TrendingUp className="h-3.5 w-3.5" /> +8.4%
            </div>
          </div>
          <button className="px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 transition flex items-center gap-2 shadow-xl shadow-foreground/5">
            <Plus className="h-4 w-4" /> Create Team
          </button>
        </div>
      </div>

      {user.plan !== "pro" ? (
        <div className="relative group">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-20 rounded-[2rem] border-2 border-dashed border-border flex flex-col items-center justify-center p-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-blue-500/10 text-blue-500 grid place-items-center mb-6">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold mb-2">Unlock Team Intelligence</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-8">
              Benchmark your engineering impact against your team, automate
              manager reporting, and sync high-signal architectural shifts.
            </p>
            <button
              onClick={handleUpgrade}
              className="group px-8 py-4 rounded-2xl bg-blue-500 text-white font-black text-sm transition-all duration-300 shadow-[0_24px_60px_-16px_rgba(59,130,246,0.45)] hover:-translate-y-0.5 hover:shadow-[0_32px_80px_-16px_rgba(59,130,246,0.6)] flex items-center gap-3"
            >
              Upgrade to Pro{" "}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>

          <div className="opacity-40 select-none pointer-events-none grid md:grid-cols-[1.5fr_1fr] gap-8">
            <div className="rounded-3xl border border-border bg-muted/20 p-8">
              <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-8 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-blue-500" /> Impact Leaderboard
              </h4>
              <div className="space-y-6">
                {demoTeam.map((member, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-background border border-border grid place-items-center font-bold text-xs">
                        {member.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-bold">{member.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-black">
                          {member.status}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-blue-500">
                        {member.impact}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] font-bold",
                          member.velocity.startsWith("+")
                            ? "text-green-500"
                            : "text-red-500",
                        )}
                      >
                        {member.velocity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="rounded-3xl border border-border bg-muted/20 p-8">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-6">
                  Aggregate Velocity
                </h4>
                <div className="h-24 w-full flex items-end gap-1.5 pb-2">
                  {[40, 70, 45, 90, 65, 80, 100, 85].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{
                        delay: 0.2 + i * 0.05,
                        duration: 0.6,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="flex-1 bg-blue-500/20 rounded-t-sm"
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground uppercase pt-4 border-t border-border">
                  <span>Week 18</span>
                  <span>Week 22</span>
                </div>
              </div>

              <div className="rounded-3xl border border-blue-500/15 bg-blue-500/5 p-8">
                <div className="flex items-center gap-2 text-blue-500 mb-2">
                  <Star className="h-4 w-4 fill-blue-500" />
                  <span className="text-xs font-black uppercase tracking-widest">
                    Top Signal
                  </span>
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  Your team's architectural focus shifted 24% towards{" "}
                  <span className="text-blue-500 font-bold">
                    System Reliability
                  </span>{" "}
                  this month.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-32 text-center border-2 border-dashed border-border rounded-[2.5rem] bg-muted/10">
          <div className="h-16 w-16 rounded-[1.5rem] bg-muted grid place-items-center mx-auto mb-6">
            <Users className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-bold">No Teams Yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-[320px] mx-auto leading-relaxed">
            Create a team to benchmark impact, sync architectural signals, and
            automate performance reviews.
          </p>
          <button className="mt-8 px-8 py-3 rounded-2xl bg-foreground text-background font-bold text-sm hover:opacity-90 transition shadow-xl shadow-foreground/5">
            Create Your First Team
          </button>
        </div>
      )}
    </div>
  );
}
