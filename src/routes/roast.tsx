import { createFileRoute } from "@tanstack/react-router";
import { Roast } from "@/components/site/Roast";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/roast")({
  component: RoastPage,
});

function RoastPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="pt-20">
        <Roast />
      </main>
      <Footer />
    </div>
  );
}
