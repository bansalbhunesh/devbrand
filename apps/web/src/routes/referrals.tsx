import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getReferralData } from "@/rpc";
import {
  Users,
  Copy,
  CheckCircle2,
  Gift,
  ArrowRight,
  Twitter,
  LayoutDashboard,
  Lock,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Reveal, RevealItem } from "@/components/site/Reveal";

export const Route = createFileRoute("/referrals")({
  component: ReferralsPage,
});

function ReferralsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["referral-data"],
    queryFn: () => getReferralData(),
    retry: false,
  });
  const [copied, setCopied] = useState(false);

  if (isLoading) {
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
              <Gift className="h-5 w-5 text-blue-500/80" />
            </div>
          </div>
          <span className="text-[10px] font-black tracking-[0.4em] text-muted-foreground uppercase">
            Loading your referrals...
          </span>
        </div>
      </div>
    );
  }

  // The referral endpoint requires auth; show a friendlier gate when it 401s.
  if (error || !data) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="max-w-md text-center">
          <div className="relative h-16 w-16 mx-auto mb-6 grid place-items-center">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-white/15"
              animate={{
                scale: [1, 1.35, 1.7],
                opacity: [0.4, 0.15, 0],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut" }}
            />
            <div className="relative h-14 w-14 rounded-full bg-muted border border-border grid place-items-center">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-black mb-3 tracking-tighter">
            Sign in to invite.
          </h1>
          <p className="text-muted-foreground mb-8 font-medium leading-relaxed">
            Referral links are unique per account — connect your GitHub to claim
            yours and start earning bonus generations.
          </p>
          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-foreground text-background font-black text-sm transition-all duration-300 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5)]"
          >
            Open Dashboard
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    );
  }

  const referralLink = `https://devbrand.dev/?ref=${data.referralCode}`;
  const tweetIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    "I've been turning my PRs into evidence-backed impact stories with DevBrand. Get extra generations when you sign up with my link:",
  )}&url=${encodeURIComponent(referralLink)}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] -translate-y-1/2 pointer-events-none" />

      <header className="relative z-10 border-b border-border px-6 py-5 flex items-center justify-between">
        <Link to="/" className="text-xl font-black tracking-tighter">
          DevBrand
        </Link>
        <Link
          to="/dashboard"
          className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition flex items-center gap-2"
        >
          <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
        </Link>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        <Reveal stagger={0.1} rootMargin="0px" className="space-y-10">
          <RevealItem>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black tracking-widest uppercase border border-blue-500/20 mb-6">
              <Users className="h-3 w-3" /> Referral Program
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-[1.05] mb-3">
              Invite teammates.{" "}
              <span className="text-blue-500">Get more generations.</span>
            </h1>
            <p className="text-muted-foreground leading-relaxed font-medium">
              You earn{" "}
              <span className="text-foreground font-bold">+5 generations</span>{" "}
              every time a new engineer signs up with your link. No cap.
            </p>
          </RevealItem>

          <RevealItem className="p-8 rounded-2xl border border-border bg-muted/20 space-y-5 shadow-2xl shadow-black/5">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              Your invite link
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-500/40 focus:ring-4 focus:ring-blue-500/5 transition"
              />
              <button
                onClick={copyToClipboard}
                className="group px-5 py-3 rounded-xl bg-foreground text-background font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-16px_rgba(0,0,0,0.55)] flex items-center justify-center gap-2"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 transition-transform duration-300 group-hover:rotate-[-8deg]" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <a
              href={tweetIntent}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition"
            >
              <Twitter className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-rotate-6" />{" "}
              Share on X
            </a>
          </RevealItem>

          <RevealItem>
            <Reveal
              stagger={0.08}
              rootMargin="0px"
              className="grid grid-cols-2 gap-4"
            >
              <RevealItem className="group p-6 rounded-2xl border border-border bg-muted/20 hover:border-border-strong hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(59,130,246,0.25)] transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Friends joined
                  </h3>
                  <div className="p-2 rounded-lg bg-background border border-border group-hover:border-blue-500/20 transition-colors">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
                <div className="text-4xl font-black tracking-tighter">
                  {data.referredCount || 0}
                </div>
              </RevealItem>
              <RevealItem className="group p-6 rounded-2xl border border-border bg-muted/20 hover:border-border-strong hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(34,197,94,0.2)] transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Bonus generations
                  </h3>
                  <div className="p-2 rounded-lg bg-background border border-border group-hover:border-green-500/20 transition-colors">
                    <Gift className="h-4 w-4 text-green-500" />
                  </div>
                </div>
                <div className="text-4xl font-black tracking-tighter text-green-500">
                  +{data.generationsBonus || 0}
                </div>
              </RevealItem>
            </Reveal>
          </RevealItem>

          <RevealItem>
            <div className="p-6 rounded-2xl border border-dashed border-border text-[12px] text-muted-foreground leading-relaxed font-medium">
              Bonuses apply only when the invited engineer connects GitHub and
              generates their first impact story. Self-referrals and shared
              GitHub accounts don't count.
            </div>
          </RevealItem>
        </Reveal>
      </main>
    </div>
  );
}
