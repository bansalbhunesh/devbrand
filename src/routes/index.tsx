import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { DemoTransform } from "@/components/site/DemoTransform";
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
        <DemoTransform />
        <Intelligence />
        <InvisibleWork />
        <Roast />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
