"use client";

import { Link } from "@tanstack/react-router";
import { Github, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed left-0 right-0 z-[100] transition-all duration-500 ease-[0.22,1,0.36,1]",
        scrolled ? "top-4" : "top-0",
      )}
    >
      <div
        className={cn(
          "mx-auto transition-all duration-500 ease-[0.22,1,0.36,1] flex items-center justify-between",
          scrolled
            ? "glass-morphism py-2 px-6 rounded-full w-fit gap-8 shadow-2xl shadow-black/60 border-white/10"
            : "w-full max-w-7xl px-8 py-8 border-b border-transparent",
        )}
      >
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center ring-soft group-hover:scale-105 transition">
            <span className="text-[12px] font-bold text-white">DB</span>
          </div>
          {!scrolled && (
            <span className="font-semibold tracking-tight text-lg">
              DevBrand
            </span>
          )}
        </Link>

        <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition">
            Home
          </Link>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="https://github.com/bansalbhunesh/devbrand"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-bold hover:opacity-90 transition shadow-lg shadow-foreground/10"
          >
            <Github className="h-3.5 w-3.5" />
            {!scrolled && "View Source"}
          </a>

          <Sheet>
            <SheetTrigger asChild>
              <button className="md:hidden p-2 text-muted-foreground hover:text-foreground transition">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-background/95 backdrop-blur-xl border-border"
            >
              <div className="flex flex-col gap-6 mt-12">
                <Link
                  to="/"
                  className="text-lg font-medium hover:text-blue-500 transition"
                >
                  Home
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
