import { useQuery } from "@tanstack/react-query";
import { getSecurityEvents } from "@/rpc.server";
import {
  Shield,
  AlertTriangle,
  ShieldCheck,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export function SecurityTab() {
  const {
    data: events,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["security_events"],
    queryFn: () => getSecurityEvents(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading)
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 bg-muted rounded-2xl border border-border"
          />
        ))}
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h3 className="font-bold">Access Denied</h3>
          <p className="text-sm text-muted-foreground">
            Security logs are restricted to Pro accounts.
          </p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-500" />
            Security Monitoring
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time audit logs of platform security events.
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-500">
          Live Feed
        </div>
      </div>

      <div className="grid gap-4">
        {events?.length === 0 ? (
          <div className="p-12 border-2 border-dashed border-border rounded-3xl flex flex-col items-center text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="font-bold text-muted-foreground">
              No security events recorded
            </p>
          </div>
        ) : (
          events?.map((event: any, i: number) => (
            <div
              key={i}
              className="group relative p-5 rounded-2xl border border-border bg-muted/5 hover:bg-muted/10 transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "mt-1 h-8 w-8 rounded-full flex items-center justify-center",
                    event.type === "login_attempt"
                      ? "bg-blue-500/10 text-blue-500"
                      : event.type === "rate_limit_exceeded"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-red-500/10 text-red-500",
                  )}
                >
                  {event.type === "login_attempt" ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {event.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(event.timestamp)} ago
                    </span>
                  </div>

                  <div className="mt-1 font-mono text-xs font-bold truncate">
                    IP: {event.ip}
                  </div>

                  {event.details && (
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(event.details).map(([k, v]) => (
                        <div
                          key={k}
                          className="px-2 py-1 rounded bg-muted/50 border border-border/50 text-[9px] font-mono"
                        >
                          <span className="opacity-50 lowercase">{k}:</span>{" "}
                          {String(v)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition">
                  <button className="p-2 text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
