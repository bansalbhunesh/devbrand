import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { DemoTransform } from "@/components/site/DemoTransform";
import { Workflow } from "@/components/site/Workflow";
import { Autonomy } from "@/components/site/Autonomy";
import { Intelligence } from "@/components/site/Intelligence";
import { Roast } from "@/components/site/Roast";
import { Pricing } from "@/components/site/Pricing";
import { InvisibleWork } from "@/components/site/InvisibleWork";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="w-full">
        <section id="hero" className="snap-start min-h-screen flex items-center w-full">
          <Hero />
        </section>
        
        <section id="demo" className="scroll-mt-20 w-full">
          <DemoTransform />
        </section>

        <section id="workflow" className="scroll-mt-20 w-full">
          <Workflow />
        </section>

        <section id="autonomy" className="scroll-mt-20 snap-start min-h-screen flex items-center w-full">
          <Autonomy />
        </section>

        <section id="intelligence" className="scroll-mt-20 snap-start min-h-screen flex items-center w-full">
          <Intelligence />
        </section>

        <section id="invisible-work" className="scroll-mt-20 snap-start min-h-screen flex items-center w-full">
          <InvisibleWork />
        </section>

        <section id="roast" className="scroll-mt-20 snap-start min-h-screen flex items-center w-full">
          <Roast />
        </section>

        <section id="pricing" className="scroll-mt-20 snap-start min-h-screen flex items-center w-full">
          <Pricing />
        </section>
      </main>
      <Footer />
    </div>
  );
}
