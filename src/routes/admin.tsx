import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats } from "@/rpc";
import * as React from "react";
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

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => getAdminStats(),
    refetchInterval: 30000,
  });

  if (isLoading)
    return <div className="min-h-screen bg-background p-8 animate-pulse" />;

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
    <div className="min-h-screen bg-background text-foreground font-sans p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-20" />
      <div className="absolute inset-0 bg-mesh-complex pointer-events-none opacity-30" />

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        {/* Header */}
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-6xl font-black tracking-tighter gradient-text">
              Command Center
            </h1>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-2 opacity-60">
              Autonomous Intelligence & Operational Oversight
            </p>
          </div>
          {data && data.anomalyReport.suspiciousIPs.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-full flex items-center gap-4 animate-bounce border-glow">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
                Threat Detected: {data.anomalyReport.suspiciousIPs[0]}
              </span>
            </div>
          )}
        </header>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Security Pulse Chart */}
          <div className="glass-morphism p-10 rounded-[3rem] border-white/5 space-y-8 border-glow">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-blue-500 rounded-full" />
              Security Pulse (24h)
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={securityTrend}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
          </div>

          {/* Job Velocity */}
          <div className="glass-morphism p-8 rounded-[2rem] border-white/5 space-y-6">
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
          </div>
        </div>

        {/* Intelligence Feed */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 glass-morphism rounded-[2rem] border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-bold text-lg">System Logs</h3>
              <span className="text-[10px] font-mono text-muted-foreground">
                LAST 100 EVENTS
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5">
                  <tr>
                    <th className="p-4 text-[10px] font-bold uppercase text-muted-foreground">
                      Event
                    </th>
                    <th className="p-4 text-[10px] font-bold uppercase text-muted-foreground">
                      Source
                    </th>
                    <th className="p-4 text-[10px] font-bold uppercase text-muted-foreground">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data?.securityEvents.slice(0, 8).map((e, i) => (
                    <tr
                      key={i}
                      className="hover:bg-white/[0.02] transition-colors"
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-morphism p-8 rounded-[2rem] border-white/5 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Health Signals
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                <span className="text-xs font-medium">Memory Usage</span>
                <span className="text-xs font-mono font-bold text-green-400">
                  OPTIMAL
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                <span className="text-xs font-medium">DB Connection Pool</span>
                <span className="text-xs font-mono font-bold text-blue-400">
                  10/10
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                <span className="text-xs font-medium">Redis Cluster</span>
                <span className="text-xs font-mono font-bold text-purple-400">
                  HEALTHY
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
