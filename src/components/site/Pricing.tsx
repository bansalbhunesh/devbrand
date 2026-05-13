"use client";

import { Check, Github, LayoutDashboard, Loader2, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getSession,
  signInWithGithub,
  createCheckoutSession,
  verifyPayment,
} from "@/rpc";
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Reveal, RevealItem } from "./Reveal";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const tiers = [
  {
    name: "Free",
    price: { monthly: "₹0", yearly: "₹0" },
    description: "Try the engine on your own PRs.",
    features: [
      "3 AI transformations / month",
      "LinkedIn post + resume bullet output",
      "Verifiable evidence citations",
      "Public profile link",
      "GitHub Roast (limited)",
    ],
    cta: "Connect GitHub",
    popular: false,
  },
  {
    name: "Pro",
    price: { monthly: "₹999", yearly: "₹799" },
    description: "Autonomous brand building from your actual engineering work.",
    features: [
      "Watch repos — auto-draft on every merge",
      "Twitter/X threads + 3 LinkedIn variants",
      "Voice memory learns from your edits",
      "Weekly digest + release notes",
      "Schedule posts for later",
      "Unlimited transformations",
      "Invisible Work analysis",
      "Annual Wrapped report",
    ],
    cta: "Go Pro",
    popular: true,
  },
  {
    name: "Team",
    price: { monthly: "₹3999", yearly: "₹3199" },
    description: "Help your team showcase their impact.",
    features: [
      "Everything in Pro for every seat",
      "Team-wide impact dashboard",
      "Internal reputation scoring",
      "Hiring lead export",
      "Custom domain",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export function Pricing() {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const navigate = useNavigate();

  const handleAction = async (tier: string) => {
    if (!session) {
      setLoading("auth");
      const res = await signInWithGithub();
      if ("error" in res && res.error) {
        setLoading(null);
        return;
      }
      if (!("url" in res) || !res.url) {
        setLoading(null);
        return;
      }
      window.location.href = res.url;
      return;
    }

    if (tier === "Pro") {
      setLoading("checkout");
      try {
        const order = await createCheckoutSession();

        const options = {
          key: order.key,
          amount: order.amount,
          currency: order.currency,
          name: "DevBrand",
          description: "Pro Subscription",
          order_id: order.orderId,
          handler: async function (response: any) {
            setLoading("verifying");
            try {
              const res = await verifyPayment({ data: response });
              if (res.success) {
                toast.success("Welcome to Pro!");
                navigate({ to: "/dashboard" });
              }
            } catch (err) {
              toast.error("Payment verification failed. Contact support.");
            } finally {
              setLoading(null);
            }
          },
          prefill: {
            name: order.userName,
            email: order.userEmail,
          },
          theme: {
            color: "#3b82f6",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err) {
        toast.error("Could not start checkout. Try again.");
      } finally {
        setLoading(null);
      }
    }
  };

  return (
    <section
      id="pricing"
      className="py-32 border-t border-border bg-muted/10 relative overflow-hidden"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-6"
          >
            Pricing
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-6"
          >
            No hype. Just high-signal data.
          </motion.h2>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span
              className={cn(
                "text-sm font-medium transition",
                billingCycle === "monthly"
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              Monthly
            </span>
            <button
              onClick={() =>
                setBillingCycle((prev) =>
                  prev === "monthly" ? "yearly" : "monthly",
                )
              }
              aria-label="Toggle billing cycle"
              className="relative w-12 h-6 rounded-full bg-muted border border-border p-1 transition-colors hover:border-blue-500/50"
            >
              <motion.div
                animate={{ x: billingCycle === "monthly" ? 0 : 24 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-4 h-4 rounded-full bg-blue-500 shadow-sm"
              />
            </button>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-medium transition",
                  billingCycle === "yearly"
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                Yearly
              </span>
              <span className="text-[10px] font-bold bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">
                SAVE 20%
              </span>
            </div>
          </div>
        </div>

        <Reveal
          stagger={0.08}
          rootMargin="-15% 0px -15% 0px"
          className="grid md:grid-cols-3 gap-8 items-start mt-20"
        >
          {tiers.map((tier) => (
            <RevealItem
              key={tier.name}
              className={cn(
                "relative flex flex-col p-10 rounded-3xl border transition-all duration-300 hover:-translate-y-1",
                tier.popular
                  ? "border-blue-500/40 bg-background/60 backdrop-blur-xl shadow-2xl shadow-blue-500/10 z-10 hover:shadow-[0_32px_80px_-16px_rgba(59,130,246,0.35)]"
                  : "border-border bg-muted/20 hover:shadow-[0_24px_60px_-24px_rgba(255,255,255,0.08)]",
              )}
            >
              {tier.popular && (
                <div className="absolute top-0 right-10 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-blue-500/20">
                  <Zap className="h-3 w-3 fill-current" /> Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1 h-[60px] overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={billingCycle}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="text-5xl font-bold tracking-tighter"
                    >
                      {billingCycle === "monthly"
                        ? tier.price.monthly
                        : tier.price.yearly}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-muted-foreground font-medium">/mo</span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  {tier.description}
                </p>
              </div>

              <div className="flex-1 space-y-5">
                {tier.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-start gap-3 text-sm font-medium"
                  >
                    <Check className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <span className="text-foreground/80">{feature}</span>
                  </div>
                ))}
              </div>

              {session && tier.name === "Free" ? (
                <Link
                  to="/dashboard"
                  className="mt-12 w-full py-4 rounded-2xl bg-muted border border-border text-foreground font-bold text-sm hover:bg-muted/60 transition text-center flex items-center justify-center gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
                </Link>
              ) : (
                <button
                  onClick={() => handleAction(tier.name)}
                  disabled={loading !== null && tier.name !== "Team"}
                  className={cn(
                    "mt-12 w-full py-4 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2",
                    tier.popular
                      ? "bg-foreground text-background hover:opacity-90 shadow-xl shadow-foreground/5"
                      : "bg-background border border-border hover:bg-muted/50",
                  )}
                >
                  {loading === "auth" && tier.name !== "Team" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (loading === "checkout" || loading === "verifying") &&
                    tier.name === "Pro" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : tier.name === "Pro" ? (
                    <>
                      <Zap className="h-4 w-4 fill-current" /> {tier.cta}
                    </>
                  ) : tier.name === "Free" ? (
                    <>
                      <Github className="h-4 w-4" /> {tier.cta}
                    </>
                  ) : (
                    tier.cta
                  )}
                </button>
              )}
            </RevealItem>
          ))}
        </Reveal>

        {/* Comparison Table */}
        <div className="mt-40 max-w-4xl mx-auto overflow-x-auto">
          <h3 className="text-2xl font-bold tracking-tight text-center mb-12">
            Detailed Comparison
          </h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-6 px-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Feature
                </th>
                <th className="py-6 px-4 text-sm font-bold uppercase tracking-widest text-muted-foreground text-center">
                  Free
                </th>
                <th className="py-6 px-4 text-sm font-bold uppercase tracking-widest text-muted-foreground text-center">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <ComparisonRow
                label="AI PR Transformations"
                free="3 / month"
                pro="Unlimited"
              />
              <ComparisonRow
                label="Impact Scoring (8-layer Engine)"
                free={true}
                pro={true}
              />
              <ComparisonRow
                label="LinkedIn Post Generation (3 variants)"
                free={true}
                pro={true}
              />
              <ComparisonRow
                label="Resume Bullet + Interview Hook"
                free={true}
                pro={true}
              />
              <ComparisonRow
                label="Verifiable Evidence Citations"
                free={true}
                pro={true}
              />
              <ComparisonRow
                label="Twitter / X Thread Generation"
                free={false}
                pro={true}
              />
              <ComparisonRow
                label="Watch repos — auto-draft on merge"
                free={false}
                pro={true}
              />
              <ComparisonRow
                label="Voice Memory (learns from your edits)"
                free={false}
                pro={true}
              />
              <ComparisonRow
                label="Weekly Digest + Release Notes"
                free={false}
                pro={true}
              />
              <ComparisonRow
                label="Schedule Posts For Later"
                free={false}
                pro={true}
              />
              <ComparisonRow
                label="Invisible Work Signal Analysis"
                free={false}
                pro={true}
              />
              <ComparisonRow
                label="GitHub Roast Engine"
                free="Limited"
                pro="Unlimited"
              />
              <ComparisonRow label="Priority Support" free={false} pro={true} />
            </tbody>
          </table>
        </div>

        <div className="mt-24 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground/60 mb-6">
            Trusted by engineers at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 grayscale opacity-40">
            {[
              "VERCEL",
              "RAZORPAY",
              "LINEAR",
              "SUPABASE",
              "GITHUB",
              "RAYCAST",
            ].map((b) => (
              <span
                key={b}
                className="font-mono text-xs font-black tracking-[0.3em]"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonRow({
  label,
  free,
  pro,
}: {
  label: string;
  free: boolean | string;
  pro: boolean | string;
}) {
  return (
    <tr className="border-b border-border/50 group hover:bg-muted/10 transition-colors">
      <td className="py-5 px-4 font-medium text-foreground/80">{label}</td>
      <td className="py-5 px-4 text-center">
        {typeof free === "boolean" ? (
          free ? (
            <Check className="h-4 w-4 text-blue-500 mx-auto" />
          ) : (
            <span className="text-muted-foreground/30">—</span>
          )
        ) : (
          <span className="text-xs font-semibold">{free}</span>
        )}
      </td>
      <td className="py-5 px-4 text-center font-bold text-blue-500">
        {typeof pro === "boolean" ? (
          pro ? (
            <Check className="h-4 w-4 text-blue-500 mx-auto" />
          ) : (
            <span className="text-muted-foreground/30">—</span>
          )
        ) : (
          <span className="text-xs font-black">{pro}</span>
        )}
      </td>
    </tr>
  );
}
