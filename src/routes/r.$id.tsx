import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRoast, postToX } from "@/rpc";
import {
  Share2,
  Twitter,
  Flame,
  ArrowRight,
  ShieldCheck,
  Check,
  Link2,
  Ghost,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Reveal, RevealItem } from "@/components/site/Reveal";

import { getPublicSiteUrl } from "@/lib/public-site";

export const Route = createFileRoute("/r/$id")({
  component: RoastPage,
  head: (ctx) => {
    const id = ctx.params.id;
    return {
      meta: [
        { title: "DevBrand // Verified GitHub Roast" },
        {
          name: "description",
          content: "Our AI just judged this GitHub profile. See the fallout.",
        },
        { property: "og:title", content: "DevBrand // Humiliation Registry" },
        {
          property: "og:description",
          content: "A verifiable judgment of technical reputation.",
        },
        {
          property: "og:image",
          content: `${getPublicSiteUrl()}/api/og/roast/${id}`,
        },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "DevBrand Roast // Impact Verified" },
        {
          name: "twitter:description",
          content: "Click to see the full technical roast.",
        },
        {
          name: "twitter:image",
          content: `${getPublicSiteUrl()}/api/og/roast/${id}`,
        },
      ],
    };
  },
});

function RoastPage() {
  const { id } = Route.useParams();
  const [posting, setPosting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: roastData, isLoading } = useQuery({
    queryKey: ["roast", id],
    queryFn: () => getRoast({ data: id }),
  });

  if (isLoading)
    return (
      <div className="min-h-screen grid place-items-center bg-[#050505] text-white">
        <div className="flex flex-col items-center gap-8">
          <div className="relative h-20 w-20 grid place-items-center">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-red-500/40"
              animate={{
                scale: [1, 1.4, 1.8],
                opacity: [0.5, 0.2, 0],
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-red-500/40"
              animate={{
                scale: [1, 1.4, 1.8],
                opacity: [0.5, 0.2, 0],
              }}
              transition={{
                duration: 2.8,
                delay: 1.4,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
            <div className="relative h-12 w-12 rounded-full bg-red-500/10 border border-red-500/30 grid place-items-center">
              <Flame className="h-5 w-5 text-red-500/80" />
            </div>
          </div>
          <span className="font-mono uppercase tracking-[0.3em] text-[10px] text-muted-foreground">
            Decrypting humiliation...
          </span>
        </div>
      </div>
    );

  if (!roastData)
    return (
      <div className="min-h-screen grid place-items-center bg-[#050505] text-white p-6">
        <div className="max-w-md text-center">
          <div className="relative h-16 w-16 mx-auto mb-6 grid place-items-center">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-red-500/25"
              animate={{
                scale: [1, 1.35, 1.7],
                opacity: [0.4, 0.15, 0],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut" }}
            />
            <div className="relative h-14 w-14 rounded-full bg-white/5 border border-white/15 grid place-items-center">
              <Ghost className="h-5 w-5 text-white/60" />
            </div>
          </div>
          <h1 className="text-3xl font-black mb-3 tracking-tighter">
            Roast not found.
          </h1>
          <p className="text-muted-foreground mb-8 font-medium leading-relaxed">
            This judgment has been redacted or never existed. The registry keeps
            no record.
          </p>
          <Link
            to="/"
            hash="roast"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-red-500 text-white font-black text-sm transition-all duration-300 shadow-[0_18px_40px_-12px_rgba(239,68,68,0.5)] hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-12px_rgba(239,68,68,0.65)]"
          >
            Roast Someone Else
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    );

  const { roast, criticality, card_title, roast_score, share_summary } =
    roastData.roastData;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to registry");
  };

  const handlePostToX = async () => {
    setPosting(true);
    try {
      await postToX({ data: { id, content: share_summary } });
      toast.success("Broadcasted to the timeline");
    } catch (e) {
      toast.error("Failed to broadcast humiliation");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-500/30 p-6 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient red glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-red-500/5 rounded-full blur-[140px] -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[100px] translate-y-1/2 pointer-events-none" />

      <Reveal
        stagger={0.12}
        rootMargin="0px"
        className="max-w-3xl w-full relative z-10"
      >
        <RevealItem className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black tracking-widest uppercase mb-6">
            <Flame className="h-3.5 w-3.5" /> High Criticality Roast
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 leading-tight">
            {card_title}
          </h1>
          <p className="text-muted-foreground font-medium uppercase tracking-[0.4em] text-[10px] flex items-center justify-center gap-3">
            <span className="opacity-40">Registered Hubris</span>
            <span className="h-1 w-1 rounded-full bg-red-500/30" />
            <span className="text-foreground">@{roastData.githubUsername}</span>
          </p>
        </RevealItem>

        <RevealItem className="p-12 md:p-20 rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-2xl relative group mb-16 shadow-2xl shadow-red-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-[0.01] group-hover:opacity-[0.03] transition-opacity duration-1000 pointer-events-none">
            <Flame className="h-64 w-64" />
          </div>

          <p className="text-2xl md:text-4xl text-foreground font-black leading-tight mb-20 italic decoration-red-500/10 underline-offset-8 decoration-4 underline">
            "{roast}"
          </p>

          <div className="flex flex-wrap gap-12 items-end pt-12 border-t border-white/5">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                Technical Hubris
              </div>
              <div className="text-6xl font-black text-red-500 tracking-tighter">
                {roast_score}%
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                Verdict
              </div>
              <div className="text-xl font-bold uppercase tracking-tight text-foreground/80">
                {criticality}
              </div>
            </div>
            <div className="ml-auto text-right hidden sm:block">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                Registry Hash
              </div>
              <div className="text-[10px] font-mono opacity-20 hover:opacity-100 transition-opacity uppercase">
                {id}
              </div>
            </div>
          </div>
        </RevealItem>

        <RevealItem className="flex flex-col items-center gap-12">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handlePostToX}
              disabled={posting}
              className="group flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-black font-black text-sm transition-all duration-300 shadow-[0_24px_60px_-16px_rgba(255,255,255,0.25)] hover:-translate-y-0.5 hover:shadow-[0_32px_80px_-16px_rgba(255,255,255,0.4)] disabled:opacity-50 disabled:translate-y-0"
            >
              <Twitter className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-6" />{" "}
              {posting ? "Broadcasting..." : "Broadcast to X"}
            </button>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 px-10 py-5 rounded-2xl bg-[#0077b5] text-white font-black text-sm transition-all duration-300 shadow-[0_24px_60px_-16px_rgba(0,119,181,0.5)] hover:-translate-y-0.5 hover:shadow-[0_32px_80px_-16px_rgba(0,119,181,0.7)]"
            >
              <Share2 className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-6" />{" "}
              LinkedIn fallout
            </a>
            <button
              onClick={handleCopyLink}
              className="group p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 transition-all duration-300"
              aria-label="Copy roast link"
            >
              {copied ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <Link2 className="h-5 w-5 transition-transform duration-300 group-hover:rotate-[-8deg]" />
              )}
            </button>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="h-px w-20 bg-white/10" />
            <Link
              to="/"
            hash="roast"
              className="group text-xs font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-red-500 transition-all flex items-center gap-3"
            >
              Get Roasted Yourself{" "}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </RevealItem>
      </Reveal>

      <footer className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
        <ShieldCheck className="h-3 w-3" /> Proof of technical Hubris registered
        via DevBrand AI
      </footer>
    </div>
  );
}
