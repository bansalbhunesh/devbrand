import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { DemoTransform } from "@/components/site/DemoTransform";
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
      <Nav />
      <main>
        <Hero />

        <section id="demo" className="scroll-mt-20">
          <DemoTransform />
        </section>

        {/* Autonomy sits above Intelligence because the headline v2 shift
            is category-level: from "tool the user opens" to "agent that
            watches your work". This section pitches that, the next two
            sections pitch the depth of what the agent does. */}
        <section id="autonomy" className="scroll-mt-20">
          <Autonomy />
        </section>

        <section id="intelligence" className="scroll-mt-20">
          <Intelligence />
        </section>

        <section id="invisible-work" className="scroll-mt-20">
          <InvisibleWork />
        </section>

        <section id="roast" className="scroll-mt-20">
          <Roast />
        </section>

        <section id="pricing" className="scroll-mt-20">
          <Pricing />
        </section>
      </main>
      <Footer />
    </div>
  );
}
