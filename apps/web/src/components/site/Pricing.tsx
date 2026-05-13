import { Check } from "lucide-react";
import { motion } from "framer-motion";

export function Pricing() {
  const tiers = [
    {
      name: "Open Source",
      price: "$0",
      description: "For individual developers roasting public repos.",
      features: [
        "Brutally Honest Repo Roast",
        "Public Reputation Profile",
        "AI Slop Detection (Basic)",
        "LinkedIn Shareable Artifacts",
      ],
      cta: "Roast Now",
      highlight: false,
    },
    {
      name: "Professional",
      price: "$29",
      description: "For engineers building their career leverage.",
      features: [
        "Private Repo Intelligence",
        "Predictive Debt Forecasting",
        "Advanced Slop Scanner",
        "Career Velocity Tracking",
        "Priority AI Routing",
      ],
      cta: "Go Pro",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For hiring teams and engineering leaders.",
      features: [
        "Team Engineering Judgment",
        "Architectural Drift Alerts",
        "Hiring Pipeline Intelligence",
        "Custom Compliance Verdicts",
        "SLA & Dedicated Support",
      ],
      cta: "Contact Sales",
      highlight: false,
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
          Invest in <span className="text-blue-500">Reputation.</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Monetize your engineering judgment. Pick the plan that matches your ambition.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {tiers.map((tier, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative p-8 rounded-3xl border ${
              tier.highlight
                ? "bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20"
                : "bg-muted/20 border-white/10"
            }`}
          >
            {tier.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest">
                Most Popular
              </div>
            )}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">{tier.price}</span>
                {tier.price !== "Custom" && <span className="text-muted-foreground text-sm">/mo</span>}
              </div>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                {tier.description}
              </p>
            </div>
            <div className="space-y-4 mb-8">
              {tier.features.map((feature, j) => (
                <div key={j} className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-blue-500" />
                  {feature}
                </div>
              ))}
            </div>
            <button
              className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                tier.highlight
                  ? "bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/20"
                  : "bg-white/5 hover:bg-white/10 border border-white/10"
              }`}
            >
              {tier.cta}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
