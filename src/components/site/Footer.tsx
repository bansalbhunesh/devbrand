"use client";

import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-14 grid md:grid-cols-[1.2fr_1fr_1fr_1fr] gap-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-blue to-purple grid place-items-center ring-soft">
              <span className="text-[11px] font-bold text-background">DB</span>
            </div>
            <span className="font-semibold">DevBrand</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground max-w-xs">
            The operating system for developer reputation. Make your invisible work visible.
          </p>
          <div className="mt-5 flex items-center gap-3 text-muted-foreground">
            <a href="#" className="hover:text-foreground transition"><Github className="h-4 w-4" /></a>
          </div>
        </div>

        <FooterCol title="Product" links={["Demo", "Wrapped", "Pricing", "Roast"]} />
        <FooterCol title="Resources" links={["Docs", "Changelog", "Privacy", "Terms"]} />
        <FooterCol title="Company" links={["About", "Contact", "Brand", "Status"]} />
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} DevBrand. All rights reserved.</div>
          <div className="font-mono">v0.1 · built for engineers</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{title}</div>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l}><a href="#" className="text-foreground/80 hover:text-foreground transition">{l}</a></li>
        ))}
      </ul>
    </div>
  );
}
