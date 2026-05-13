import { readSecurityEvents } from "./redis.server";

export interface AnomalyReport {
  suspiciousIPs: string[];
  totalEvents: number;
}

export async function analyzeIPBehavior(): Promise<AnomalyReport> {
  const events = await readSecurityEvents(200);
  const ipCounts: Record<string, number> = {};

  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  for (const event of events) {
    if (event.timestamp.getTime() > fiveMinutesAgo) {
      ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
    }
  }

  const suspiciousIPs = Object.entries(ipCounts)
    .filter(([_, count]) => count > 50) // More than 50 events in 5 minutes
    .map(([ip]) => ip);

  return {
    suspiciousIPs,
    totalEvents: events.length,
  };
}
