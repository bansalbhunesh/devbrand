"use client";

import { Check, Github, LayoutDashboard, Loader2, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSession, signInWithGithub, createCheckoutSession, verifyPayment } from "@/rpc.server";
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const tiers = [
  {
    name: "Free",
    price: "₹0",
    description: "Perfect for students and early-career devs.",
    features: [
      "Monthly Wrapped reports",
      "3 AI transformations / mo",
      "Public profile link",
      "GitHub Roast (limited)",
    ],
    cta: "Connect GitHub",
    popular: false,
  },
  {
    name: "Pro",
    price: "₹999",
    description: "For active engineers building their reputation.",
    features: [
      "Unlimited AI transformations",
      "Custom branding for reports",
      "Advanced 'Invisible Work' analysis",
      "LinkedIn auto-drafting",
      "Priority API access",
    ],
    cta: "Go Pro",
    popular: true,
  },
  {
    name: "Team",
    price: "₹3999",
    description: "Help your team showcase their impact.",
    features: [
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
  const { data: session } = useQuery({ queryKey: ["session"], queryFn: () => getSession() });
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAction = async (tier: string) => {
    if (!session) {
      setLoading("auth");
      const { url } = await signInWithGithub();
      window.location.href = url;
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
    <section id="pricing" className="py-32 border-t border-border bg-muted/10 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-6">
            Pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">No hype. Just high-signal data.</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Choose the plan that fits your career stage. All plans start with a 30-day read-only trial.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "relative flex flex-col p-10 rounded-3xl border transition-all duration-300",
                tier.popular 
                  ? "border-blue-500/40 bg-background shadow-2xl shadow-blue-500/10 scale-105 z-10" 
                  : "border-border bg-muted/20 hover:bg-muted/40"
              )}
            >
              {tier.popular && (
                <div className="absolute top-0 right-10 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-blue-500/20">
                  <Zap className="h-3 w-3 fill-current" /> Most Popular
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tighter">{tier.price}</span>
                  <span className="text-muted-foreground font-medium">/mo</span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{tier.description}</p>
              </div>
              
              <div className="flex-1 space-y-5">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm font-medium">
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
                      : "bg-background border border-border hover:bg-muted/50"
                  )}
                >
                  {loading === "auth" && tier.name !== "Team" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (loading === "checkout" || loading === "verifying") && tier.name === "Pro" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : tier.name === "Pro" ? (
                    <><Zap className="h-4 w-4 fill-current" /> {tier.cta}</>
                  ) : tier.name === "Free" ? (
                    <><Github className="h-4 w-4" /> {tier.cta}</>
                  ) : (
                    tier.cta
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-24 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground/60 mb-6">
            Trusted by engineers at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 grayscale opacity-40">
             {["VERCEL", "RAZORPAY", "LINEAR", "SUPABASE", "GITHUB", "RAYCAST"].map((b) => (
                <span key={b} className="font-mono text-xs font-black tracking-[0.3em]">{b}</span>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
