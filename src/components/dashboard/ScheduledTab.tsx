import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, Loader2, Share2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cancelScheduledPost, listScheduledPosts } from "@/rpc";
import { cn } from "@/lib/utils";

type ScheduledPostRow = {
  id: string;
  outputId: string;
  channel: string;
  postKind: string;
  scheduledFor: string;
  status: string;
  readyAt: string | null;
  shareUrl: string | null;
  createdAt: string;
  outputSlug: string | null;
  outputTitle: string | null;
};

const channelLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter / X",
};

const postKindLabels: Record<string, string> = {
  linkedinPost1: "Problem / Outcome",
  linkedinPost2: "Tradeoff / Decision",
  linkedinPost3: "Learnings",
  twitterThread: "Thread",
};

export function ScheduledTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["scheduled-posts"],
    queryFn: () => listScheduledPosts(),
    refetchInterval: 30_000,
  });

  const posts: ScheduledPostRow[] = (data as any)?.posts ?? [];
  const ready = posts.filter((p) => p.status === "READY");
  const scheduled = posts.filter((p) => p.status === "SCHEDULED");
  const archived = posts.filter(
    (p) => p.status === "CANCELLED" || p.status === "FAILED",
  );

  const cancel = useMutation({
    mutationFn: async (id: string) => cancelScheduledPost({ data: { id } }),
    onSuccess: () => {
      toast.success("Scheduled post cancelled");
      qc.invalidateQueries({ queryKey: ["scheduled-posts"] });
    },
    onError: () => toast.error("Couldn't cancel that schedule"),
  });

  if (isLoading) {
    return (
      <div className="h-72 grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-4xl">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight mb-2">
          Scheduled posts
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          Draft once, ship later. Posts in this list flip to{" "}
          <span className="text-foreground font-medium">Ready</span> at the
          scheduled time with a one-click share link pre-built.
        </p>
      </header>

      <Section title="Ready to share" count={ready.length} accent="emerald">
        <AnimatePresence initial={false}>
          {ready.length === 0 ? (
            <EmptyRow message="Nothing ready yet. Scheduled posts land here once their time arrives." />
          ) : (
            ready.map((p) => (
              <Row key={p.id} post={p}>
                <a
                  href={p.shareUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-400 transition active:scale-[0.98]"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share now
                </a>
              </Row>
            ))
          )}
        </AnimatePresence>
      </Section>

      <Section title="Upcoming" count={scheduled.length} accent="blue">
        <AnimatePresence initial={false}>
          {scheduled.length === 0 ? (
            <EmptyRow message="No posts queued. Use the Schedule button on a generated story to add one." />
          ) : (
            scheduled.map((p) => (
              <Row key={p.id} post={p}>
                <button
                  onClick={() => cancel.mutate(p.id)}
                  disabled={cancel.isPending && cancel.variables === p.id}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-muted-foreground hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 text-[11px] font-black uppercase tracking-widest transition disabled:opacity-50"
                >
                  {cancel.isPending && cancel.variables === p.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Cancel
                </button>
              </Row>
            ))
          )}
        </AnimatePresence>
      </Section>

      {archived.length > 0 && (
        <Section title="Archived" count={archived.length} accent="muted">
          {archived.map((p) => (
            <Row key={p.id} post={p}>
              <span
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  p.status === "CANCELLED"
                    ? "border-white/10 text-muted-foreground"
                    : "border-red-500/30 text-red-400",
                )}
              >
                {p.status === "CANCELLED" ? "Cancelled" : "Failed"}
              </span>
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent: "emerald" | "blue" | "muted";
  children: React.ReactNode;
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "blue"
        ? "text-blue-400"
        : "text-muted-foreground";
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02]">
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <div
          className={cn(
            "text-[10px] font-black uppercase tracking-[0.3em]",
            accentClass,
          )}
        >
          {title}
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          {count}
        </div>
      </div>
      <ul className="divide-y divide-white/5">{children}</ul>
    </div>
  );
}

function Row({
  post,
  children,
}: {
  post: ScheduledPostRow;
  children: React.ReactNode;
}) {
  const when = new Date(post.scheduledFor);
  const whenStr = when.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-4 p-5"
    >
      <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 grid place-items-center">
        {post.status === "READY" ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : post.status === "CANCELLED" || post.status === "FAILED" ? (
          <X className="h-4 w-4 text-muted-foreground" />
        ) : (
          <CalendarClock className="h-4 w-4 text-blue-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">
          {post.outputTitle ?? "(deleted story)"}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {channelLabels[post.channel] ?? post.channel} ·{" "}
          {postKindLabels[post.postKind] ?? post.postKind} · {whenStr}
        </div>
      </div>
      {children}
    </motion.li>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <li className="p-8 text-center text-[12px] text-muted-foreground">
      {message}
    </li>
  );
}
