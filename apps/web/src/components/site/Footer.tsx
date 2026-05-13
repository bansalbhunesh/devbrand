"use client";

import { Github, Twitter, Linkedin } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-background pt-20">
      <div className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-16">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center shadow-lg shadow-blue-500/20">
                <span className="text-[12px] font-bold text-white">DB</span>
              </div>
              <span className="font-bold text-lg tracking-tight">DevBrand</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-8">
              The reputation layer for modern software engineers. We turn
              complex technical artifacts into verifiable career leverage.
            </p>
            <div className="flex items-center gap-5 text-muted-foreground">
              <a
                href="https://github.com/devbrand"
                className="hover:text-foreground transition-colors"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com/devbrand"
                className="hover:text-foreground transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="https://linkedin.com/company/devbrand"
                className="hover:text-foreground transition-colors"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          <FooterCol
            title="Product"
            links={[
              { label: "Intelligence", to: "/#intelligence" },
              { label: "The Verdict", to: "/#roast" },
              { label: "Pricing", to: "/#pricing" },
              { label: "Annual Wrapped", to: "/wrapped" },
            ]}
          />

          <FooterCol
            title="Developers"
            links={[
              { label: "Documentation", to: "/" },
              { label: "API Reference", to: "/" },
              { label: "System Status", to: "/" },
              { label: "Open Source", to: "/" },
            ]}
          />

          <FooterCol
            title="Legal"
            links={[
              { label: "Privacy Policy", to: "/" },
              { label: "Terms of Service", to: "/" },
              { label: "Cookie Policy", to: "/" },
              { label: "Security", to: "/" },
            ]}
          />
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          <div>© {new Date().getFullYear()} DevBrand Intelligence Corp.</div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-green-500" /> All systems
              operational
            </span>
            <span className="font-mono lowercase tracking-normal opacity-50">
              v1.0.4-stable
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; to: string }[];
}) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-8">
        {title}
      </div>
      <ul className="space-y-4">
        {links.map((l, i) => (
          <li key={i}>
            <Link
              to={l.to as any}
              className="text-sm font-medium text-foreground/60 hover:text-blue-500 transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
