"use client";

import { Link } from "@tanstack/react-router";
import { Github, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        scrolled 
          ? "bg-background/80 backdrop-blur-md border-border py-3" 
          : "bg-transparent border-transparent py-5"
      )}
    >
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue to-purple grid place-items-center ring-soft group-hover:scale-105 transition">
            <span className="text-[12px] font-bold text-background">DB</span>
          </div>
          <span className="font-semibold tracking-tight text-lg">DevBrand</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition">Intelligence</Link>
          <Link to="/" className="hover:text-foreground transition">Roast</Link>
          <Link to="/" className="hover:text-foreground transition">Wrapped</Link>
          <Link to="/" className="hover:text-foreground transition">Pricing</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            to="/" 
            className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-80 transition"
          >
            Sign in
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium ring-soft hover:opacity-90 transition"
          >
            <Github className="h-4 w-4" /> Start for free
          </Link>

          <Sheet>
            <SheetTrigger asChild>
              <button className="md:hidden p-2 text-muted-foreground hover:text-foreground transition">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background/95 backdrop-blur-xl border-border">
              <div className="flex flex-col gap-6 mt-12">
                <Link to="/" className="text-lg font-medium hover:text-blue transition">Intelligence</Link>
                <Link to="/" className="text-lg font-medium hover:text-blue transition">Roast</Link>
                <Link to="/" className="text-lg font-medium hover:text-blue transition">Wrapped</Link>
                <Link to="/" className="text-lg font-medium hover:text-blue transition">Pricing</Link>
                <hr className="border-border/50" />
                <Link to="/" className="text-lg font-medium">Sign in</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
