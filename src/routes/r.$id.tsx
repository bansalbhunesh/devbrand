import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/server/db";
import { roasts } from "@/server/schema";
import { eq } from "drizzle-orm";
import { Github, Share2, Twitter, Flame } from "lucide-react";

const getRoast = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const roast = await db.query.roasts.findFirst({
      where: eq(roasts.id, id),
    });
    if (!roast) throw new Error("ROAST_NOT_FOUND");
    return roast;
  });

const postToX = createServerFn({ method: "POST" })
  .validator((data: { id: string; content: string }) => data)
  .handler(async ({ data }) => {
    // Mock posting to X/Twitter
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true, url: `https://x.com/DevBrand/status/mock-${data.id}` };
  });

export const Route = createFileRoute("/r/$id")({
  component: RoastPage,
  head: (ctx) => {
    const id = ctx.params.id;
    return {
      meta: [
        { title: "DevBrand // Verified GitHub Roast" },
        { name: "description", content: "Our AI just judged this GitHub profile. See the fallout." },
        { property: "og:title", content: "DevBrand // Humiliation Registry" },
        { property: "og:description", content: "A verifiable judgment of technical reputation." },
        { property: "og:image", content: `${process.env.APP_URL}/api/og/roast/${id}` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "DevBrand Roast // Impact Verified" },
        { name: "twitter:description", content: "Click to see the full technical roast." },
        { name: "twitter:image", content: `${process.env.APP_URL}/api/og/roast/${id}` },
      ],
    };
  },
});


function RoastPage() {
  const { id } = Route.useParams();
  const [posting, setPosting] = useState(false);
  const { data: roastData, isLoading } = useQuery({
    queryKey: ["roast", id],
    queryFn: () => getRoast({ data: id }),
  });

  if (isLoading) return (
    <div className="min-h-screen grid place-items-center bg-black text-white font-mono uppercase tracking-widest text-xs">
      Decrypting humiliation...
    </div>
  );

  if (!roastData) return (
    <div className="min-h-screen grid place-items-center bg-black text-white">
      Roast not found.
    </div>
  );

  const { roast, criticality, card_title, roast_score, share_summary } = roastData.roastData;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(share_summary)}&url=${encodeURIComponent(window.location.href)}`;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-500/30 p-6 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter opacity-50">
            <Github className="h-4 w-4" /> {roastData.githubUsername}
          </div>
          <div className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <Flame className="h-3 w-3" /> {criticality} HUMILIATION
          </div>
        </header>

        <div className="p-12 rounded-[2.5rem] border border-white/5 bg-white/5 backdrop-blur-3xl relative overflow-hidden mb-12">
           <div className="absolute top-[-10%] right-[-10%] h-64 w-64 bg-red-500/5 blur-[100px] rounded-full" />
           
           <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-8 leading-tight">
            {card_title}
           </h1>
           
           <p className="text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed mb-12 italic">
            "{roast}"
           </p>

           <div className="flex items-center gap-8">
              <div>
                <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Humiliation</div>
                <div className="text-4xl font-black text-red-500">{roast_score}%</div>
              </div>
          <div className="h-12 w-px bg-white/10" />
              <div>
                <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Verified By</div>
                <div className="text-xl font-bold">DevBrand AI</div>
              </div>
           </div>
        </div>

         <div className="flex flex-wrap items-center justify-center gap-4">
            <button 
             onClick={async () => {
               setPosting(true);
               try {
                 await postToX({ data: { id, content: share_summary } });
                 alert("Successfully posted to your connected X account!");
               } catch (e) {
                 alert("Failed to post. Please try again.");
               } finally {
                 setPosting(false);
               }
             }}
             disabled={posting}
             className="flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-bold hover:brightness-90 transition shadow-[0_0_40px_rgba(255,255,255,0.1)] disabled:opacity-50"
            >
              <Twitter className="h-5 w-5" /> {posting ? "Posting..." : "One-Click Post to X"}
            </button>
            <a 
             href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`} 
             target="_blank" 
             rel="noreferrer"
             className="flex items-center gap-3 px-8 py-4 rounded-full bg-[#0077b5] text-white font-bold hover:brightness-110 transition shadow-[0_0_40px_rgba(0,119,181,0.1)]"
            >
              <Share2 className="h-5 w-5" /> Share on LinkedIn
            </a>
            <button 
             onClick={() => {
               navigator.clipboard.writeText(window.location.href);
               alert("Link copied!");
             }}
             className="p-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition"
            >
              <Github className="h-5 w-5" />
            </button>
         </div>

      </div>
    </div>
  );
}
