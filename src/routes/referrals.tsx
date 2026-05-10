import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/server/db";
import { users } from "@/server/schema";
import { eq, count } from "drizzle-orm";
import { getSession } from "@/server/auth";
import { Users, Copy, CheckCircle2, Gift } from "lucide-react";
import { useState } from "react";

const getReferralData = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const [user] = await db.query.users.findMany({
      where: eq(users.id, session.userId)
    });

    if (!user) throw new Error("User not found");

    const [referredCountRes] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.referredBy, session.userId));

    return {
      referralCode: user.referralCode,
      referredCount: referredCountRes.count,
      generationsBonus: referredCountRes.count * 5,
    };
  });

export const Route = createFileRoute("/referrals")({
  component: ReferralsPage,
});

function ReferralsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["referral-data"],
    queryFn: () => getReferralData(),
  });
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const referralLink = `https://devbrand.dev/?ref=${data?.referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <header className="border-b border-border p-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tighter">DevBrand</Link>
        <nav className="flex gap-4">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto p-8 mt-12 space-y-8">
        <div>
          <h1 className="text-3xl font-black mb-2 uppercase tracking-tighter flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" /> Referral Program
          </h1>
          <p className="text-muted-foreground">Invite teammates, get more generations.</p>
        </div>

        <div className="p-6 rounded-xl border border-border bg-surface/30 space-y-4">
          <h2 className="text-lg font-bold">Your Unique Invite Link</h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={referralLink} 
              className="flex-1 bg-background border border-border rounded px-4 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <button 
              onClick={copyToClipboard}
              className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded flex items-center gap-2 hover:bg-primary/90 transition"
            >
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">You get 5 extra generations for every user that signs up with this link.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 rounded-xl border border-border bg-surface/30">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Friends Joined</h3>
            <div className="text-4xl font-black">{data?.referredCount || 0}</div>
          </div>
          <div className="p-6 rounded-xl border border-border bg-surface/30">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Bonus Generations</h3>
            <div className="text-4xl font-black text-green-500 flex items-center gap-2">
              <Gift className="h-8 w-8" /> +{data?.generationsBonus || 0}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
