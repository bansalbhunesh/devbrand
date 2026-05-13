import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats } from "@/rpc";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { Reveal, RevealItem } from "@/components/site/Reveal";
import { Activity, ShieldX, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => getAdminStats(),
    refetchInterval: 30000,
    retry: false,
  });

  if (isLoading)
    return (
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
              <Activity className="h-5 w-5 text-blue-500/80" />
            </div>
          </div>
          <span className="text-[10px] font-black tracking-[0.4em] text-muted-foreground uppercase">
            Aggregating system signals...
          </span>
        </div>
      </div>
    );

  // getAdminStats throws ADMIN_REQUIRED when the session user isn't admin.
  // Show a clear gate instead of the empty animate-pulse the prior code did.
  if (error || !data)
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="max-w-md text-center">
          <div className="relative h-16 w-16 mx-auto mb-6 grid place-items-center">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-red-500/25"
              animate={{
                scale: [1, 1.35, 1.7],
                opacity: [0.4, 0.15, 0],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut" }}
            />
            <div className="relative h-14 w-14 rounded-full bg-red-500/10 border border-red-500/30 grid place-items-center">
              <ShieldX className="h-5 w-5 text-red-500/80" />
            </div>
          </div>
          <h1 className="text-3xl font-black mb-3 tracking-tighter">
            Command Center restricted.
          </h1>
          <p className="text-muted-foreground mb-8 font-medium leading-relaxed">
            This dashboard is admin-only. If you should have access, contact an
            org owner.
          </p>
          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-foreground text-background font-black text-sm transition-all duration-300 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5)]"
          >
            Back to Dashboard
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    );

  // Prepare Chart Data
  const securityTrend =
    data?.securityEvents
      .reduce((acc: any[], event) => {
        const time = new Date(event.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const existing = acc.find((a) => a.time === time);
        if (existing) existing.count++;
        else acc.push({ time, count: 1 });
        return acc;
      }, [])
      .slice(-10) || [];

  const jobStats = [
    { name: "Active", value: data?.stats.activeJobs || 0, color: "#a855f7" },
    { name: "Failed", value: data?.stats.failedJobs || 0, color: "#ef4444" },
    { name: "Total", value: data?.jobs.length || 0, color: "#3b82f6" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-20" />
      <div className="absolute inset-0 bg-mesh-complex pointer-events-none opacity-30" />

      <Reveal
        stagger={0.08}
        className="max-w-7xl mx-auto space-y-12 relative z-10"
      >
        {/* Header */}
        <RevealItem>
          <header className="flex justify-between items-end gap-6">
            <div>
              <h1 className="text-6xl font-black tracking-tighter gradient-text">
                Command Center
              </h1>
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-2 opacity-60">
                Autonomous Intelligence & Operational Oversight
              </p>
            </div>
            {data.anomalyReport.suspiciousIPs.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 px-6 py-3 rounded-full flex items-center gap-4 border-glow shrink-0">
                {/* Calmer pulse than the prior animate-bounce — keeps the
                    threat visible without making the whole header bobble. */}
                <motion.div
                  aria-hidden
                  className="h-2 w-2 bg-red-500 rounded-full"
                  animate={{ opacity: [1, 0.4, 1], scale: [1, 1.4, 1] }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
                  Threat Detected: {data.anomalyReport.suspiciousIPs[0]}
                </span>
              </div>
            )}
          </header>
        </RevealItem>

        {/* Analytics Grid */}
        <RevealItem>
          <Reveal
            stagger={0.08}
            rootMargin="0px"
            className="grid grid-cols-1 lg:grid-cols-2 gap-10"
          >
            {/* Security Pulse Chart */}
            <RevealItem className="glass-morphism p-10 rounded-[3rem] border-white/5 space-y-8 border-glow hover:-translate-y-0.5 hover:shadow-[0_32px_80px_-32px_rgba(59,130,246,0.25)] transition-all duration-500">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-blue-500 rounded-full" />
                Security Pulse (24h)
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={securityTrend}>
                    <defs>
                      <linearGradient
                        id="colorCount"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#ffffff05"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="time"
                      stroke="#ffffff20"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#ffffff20"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#000",
                        border: "1px solid #ffffff10",
                        borderRadius: "12px",
                      }}
                      itemStyle={{ color: "#3b82f6", fontSize: "12px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorCount)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </RevealItem>

            {/* Job Velocity */}
            <RevealItem className="glass-morphism p-8 rounded-[2rem] border-white/5 space-y-6 hover:-translate-y-0.5 hover:shadow-[0_32px_80px_-32px_rgba(168,85,247,0.25)] transition-all duration-500">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-purple-500 rounded-full" />
                Engine Velocity
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={jobStats}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#ffffff05"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="#ffffff20"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#ffffff20"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {jobStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </RevealItem>
          </Reveal>
        </RevealItem>

        {/* Intelligence Feed */}
        <RevealItem>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 glass-morphism rounded-[2rem] border-white/5 overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_32px_80px_-32px_rgba(59,130,246,0.18)] transition-all duration-500">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-lg">System Logs</h3>
                <span className="text-[10px] font-mono text-muted-foreground">
                  LAST {data.securityEvents.length} EVENTS
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="p-4 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                        Event
                      </th>
                      <th className="p-4 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                        Source
                      </th>
                      <th className="p-4 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.securityEvents.slice(0, 8).map((e, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: i * 0.04,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="p-4 text-xs font-bold text-blue-400 uppercase">
                          {e.type}
                        </td>
                        <td className="p-4 font-mono text-[11px] opacity-60">
                          {e.ip}
                        </td>
                        <td className="p-4 text-[11px] text-muted-foreground">
                          {new Date(e.timestamp).toLocaleTimeString()}
                        </td>
                      </motion.tr>
                    ))}
                    {data.securityEvents.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-12 text-center text-xs text-muted-foreground italic"
                        >
                          No security events logged in the current window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-morphism p-8 rounded-[2rem] border-white/5 space-y-6 hover:-translate-y-0.5 transition-all duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Health Signals
                </h3>
                <span
                  className="text-[8px] font-mono uppercase tracking-widest opacity-40"
                  title="These values are static placeholders pending real telemetry integration."
                >
                  Sample
                </span>
              </div>
              <div className="space-y-4">
                {/*
                  TODO: wire these to real Upstash / Neon / process telemetry.
                  Currently fixed placeholders so the panel doesn't render empty
                  before the observability layer lands.
                */}
                <HealthRow label="Memory Usage" value="OPTIMAL" tone="green" />
                <HealthRow
                  label="DB Connection Pool"
                  value="10/10"
                  tone="blue"
                />
                <HealthRow
                  label="Redis Cluster"
                  value="HEALTHY"
                  tone="purple"
                />
              </div>
            </div>
          </div>
        </RevealItem>
      </Reveal>
    </div>
  );
}

function HealthRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "blue" | "purple";
}) {
  const toneClass =
    tone === "green"
      ? "text-green-400"
      : tone === "blue"
        ? "text-blue-400"
        : "text-purple-400";
  return (
    <div className="group flex justify-between items-center p-4 bg-white/5 rounded-2xl hover:bg-white/[0.08] hover:-translate-y-0.5 transition-all duration-300">
      <span className="text-xs font-medium">{label}</span>
      <span className={`text-xs font-mono font-bold ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}
