"use client";

import { Link, useMatches } from "@tanstack/react-router";
import { Github, Menu, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const matches = useMatches();
  const session = (matches.find((m) => m.id === "__root")?.context as any)
    ?.session;

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
          <a href="/#demo" className="hover:text-foreground transition">
            Demo
          </a>
          <a href="/#workflow" className="hover:text-foreground transition">
            Workflow
          </a>
          <a href="/#autonomy" className="hover:text-foreground transition">
            Autonomy
          </a>
          <a href="/#roast" className="hover:text-foreground transition">
            Verdict
          </a>
          <a href="/#pricing" className="hover:text-foreground transition">
            Pricing
          </a>
          <Link to="/explore" className="hover:text-foreground transition">
            Explore
          </Link>
          <Link to="/wrapped" className="hover:text-foreground transition">
            Wrapped
          </Link>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {session ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-bold hover:opacity-90 transition shadow-lg shadow-foreground/5"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              {!scrolled && "Dashboard"}
            </Link>
          ) : (
            <>
              {!scrolled && (
                <Link
                  to="/dashboard"
                  className="hidden sm:inline-flex items-center gap-2 text-xs font-bold text-foreground hover:opacity-80 transition uppercase tracking-widest"
                >
                  Sign in
                </Link>
              )}
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-bold hover:opacity-90 transition shadow-lg shadow-foreground/10"
              >
                <Github className="h-3.5 w-3.5" />
                {!scrolled && "Start free"}
              </Link>
            </>
          )}

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
                <a
                  href="/#demo"
                  className="text-lg font-medium hover:text-blue-500 transition"
                >
                  Demo
                </a>
                <a
                  href="/#workflow"
                  className="text-lg font-medium hover:text-blue-500 transition"
                >
                  Workflow
                </a>
                <a
                  href="/#autonomy"
                  className="text-lg font-medium hover:text-blue-500 transition"
                >
                  Autonomy
                </a>
                <a
                  href="/#roast"
                  className="text-lg font-medium hover:text-blue-500 transition"
                >
                  Verdict
                </a>
                <a
                  href="/#pricing"
                  className="text-lg font-medium hover:text-blue-500 transition"
                >
                  Pricing
                </a>
                <Link
                  to="/explore"
                  className="text-lg font-medium hover:text-blue-500 transition"
                >
                  Explore
                </Link>
                <Link
                  to="/wrapped"
                  className="text-lg font-medium hover:text-blue-500 transition"
                >
                  Wrapped
                </Link>
                <hr className="border-border/50" />
                {session ? (
                  <Link
                    to="/dashboard"
                    className="text-lg font-medium flex items-center gap-2 text-blue-500"
                  >
                    <LayoutDashboard className="h-5 w-5" /> Dashboard
                  </Link>
                ) : (
                  <Link to="/dashboard" className="text-lg font-medium">
                    Sign in
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
