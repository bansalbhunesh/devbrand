"use client";

import { Check, Github } from "lucide-react";
import { SectionLabel, SectionTitle } from "./DemoTransform";

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for students and early-career devs.",
    features: [
      "Monthly Wrapped reports",
      "Basic AI summaries (10/mo)",
      "Public profile link",
      "GitHub Roast (limited)",
    ],
    cta: "Connect GitHub",
    popular: false,
  },
  {
    name: "Pro",
    price: "$12",
    description: "For active engineers building their reputation.",
    features: [
      "Unlimited AI summaries",
      "Custom branding for reports",
      "Advanced 'Invisible Work' analysis",
      "LinkedIn auto-drafting",
      "Priority API access",
    ],
    cta: "Get started",
    popular: true,
  },
  {
    name: "Team",
    price: "$49",
    description: "Help your team showcase their impact.",
    features: [
      "Team-wide impact dashboard",
      "Internal reputation scoring",
      "Hiring lead export",
      "Custom domain",
    ],
    cta: "Contact sales",
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-28 border-t border-border bg-surface/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <SectionLabel>Fair Pricing</SectionLabel>
          <SectionTitle>No hype. Just high-signal data.</SectionTitle>
          <p className="mt-5 text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your career stage. All plans start with a 30-day read-only trial.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col p-8 rounded-2xl border ${
                tier.popular ? "border-blue bg-blue/5 shadow-soft" : "border-border bg-background"
              }`}
            >
              {tier.popular && (
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-blue text-background text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{tier.description}</p>
              
              <div className="mt-8 flex-1">
                <ul className="space-y-4">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-foreground/80">
                      <Check className="h-4 w-4 text-blue mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                className={`mt-10 w-full py-3 rounded-lg text-sm font-medium transition ${
                  tier.popular
                    ? "bg-blue text-background hover:opacity-90"
                    : "bg-surface border border-border-strong hover:bg-surface-2"
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Trusted by 5,000+ developers from Vercel, Stripe, and Google.
          </p>
        </div>
      </div>
    </section>
  );
}
