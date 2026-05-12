import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Loader2,
  Copy,
  Check,
  Sparkles,
  FileText,
  Twitter,
  Linkedin,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateDigest, listDigests, getDigest } from "@/rpc";

type DigestKind = "weekly" | "release_notes";

type DigestResult = {
  id: string;
  kind: DigestKind;
  periodStart: Date | string;
  periodEnd: Date | string;
  linkedinPost: string;
  twitterThread: string[];
  releaseNotes: string;
  includedOutputIds: string[];
  createdAt: Date | string;
};

type ListedDigest = {
  id: string;
  kind: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  outputCount: number;
  createdAt: Date | string;
};

function formatDateInput(d: Date): string {
  // YYYY-MM-DD for <input type="date">
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { since: string; until: string } {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - 7);
  return { since: formatDateInput(since), until: formatDateInput(until) };
}

export function DigestTab() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<DigestKind>("weekly");
  const [range, setRange] = useState(defaultRange());
  const [result, setResult] = useState<DigestResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeFormat, setActiveFormat] = useState<
    "linkedin" | "twitter" | "release"
  >("linkedin");

  const list = useQuery({
    queryKey: ["digests"],
    queryFn: async () => (await listDigests()) as ListedDigest[],
  });

  const detail = useMutation({
    mutationFn: async (id: string) =>
      (await getDigest({ data: id })) as DigestResult,
    onSuccess: (d) => {
      setResult(d);
      setActiveFormat("linkedin");
    },
    onError: () => toast.error("Couldn't load digest"),
  });

  const generate = useMutation({
    mutationFn: async () => {
      // The RPC schema accepts strings (preprocess -> Date), but TanStack's
      // generated types want unknown — cast at the boundary, not internally.
      const sinceDate = new Date(`${range.since}T00:00:00Z`);
      const untilDate = new Date(`${range.until}T23:59:59Z`);
      return (await generateDigest({
        data: {
          kind,
          since: sinceDate as any,
          until: untilDate as any,
        } as any,
      })) as DigestResult;
    },
    onSuccess: (d) => {
      setResult(d);
      setActiveFormat("linkedin");
      qc.invalidateQueries({ queryKey: ["digests"] });
      toast.success("Digest generated!");
    },
    onError: (e: any) => {
      const msg = e?.message ?? "";
      if (msg.includes("NO_OUTPUTS_IN_RANGE")) {
        toast.error("No PRs in that date range. Generate some first.");
      } else if (msg.includes("RATE_LIMIT")) {
        toast.error("Rate limited — try again in an hour.");
      } else if (msg.includes("AI_PARSE_ERROR")) {
        toast.error("The model returned malformed JSON. Try again.");
      } else if (msg.includes("INVALID_RANGE")) {
        toast.error("Pick a valid date range.");
      } else {
        toast.error("Couldn't generate digest");
      }
    },
  });

  const copyToClipboard = (value: string, fieldId: string) => {
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(fieldId);
        setTimeout(() => setCopied((c) => (c === fieldId ? null : c)), 1600);
        toast.success("Copied");
      },
      () => toast.error("Couldn't copy to clipboard"),
    );
  };

  const twitterFull = useMemo(
    () => result?.twitterThread.join("\n\n---\n\n") ?? "",
    [result],
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight mb-2">
          Multi-PR digest
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Roll up a batch of merged PRs into a single narrative — a weekly
          retrospective or a release-notes post. Pick a date range, hit
          generate, and copy the format you need.
        </p>
      </header>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              Kind
            </label>
            <div className="flex gap-1 p-1 rounded-xl bg-black/30 border border-white/5">
              {(["weekly", "release_notes"] as DigestKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors",
                    kind === k
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {k === "weekly" ? "Weekly" : "Release Notes"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              From
            </label>
            <input
              type="date"
              value={range.since}
              onChange={(e) =>
                setRange((r) => ({ ...r, since: e.target.value }))
              }
              className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm focus:outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              To
            </label>
            <input
              type="date"
              value={range.until}
              onChange={(e) =>
                setRange((r) => ({ ...r, until: e.target.value }))
              }
              className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm focus:outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>

          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="ml-auto inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50 transition shadow-xl shadow-blue-500/20 active:scale-95"
          >
            {generate.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Generate
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">
                  {result.kind === "weekly" ? "Weekly" : "Release Notes"}
                </div>
                <div className="text-[12px] text-muted-foreground mt-1">
                  {new Date(result.periodStart).toLocaleDateString()} →{" "}
                  {new Date(result.periodEnd).toLocaleDateString()} ·{" "}
                  {result.includedOutputIds.length}{" "}
                  {result.includedOutputIds.length === 1 ? "PR" : "PRs"}
                </div>
              </div>
              <div className="flex gap-1 p-1 rounded-xl bg-black/30 border border-white/5">
                {(
                  [
                    { id: "linkedin", label: "LinkedIn", icon: Linkedin },
                    { id: "twitter", label: "Thread", icon: Twitter },
                    { id: "release", label: "Notes", icon: FileText },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFormat(f.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors",
                      activeFormat === f.id
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <f.icon className="h-3 w-3" />
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {activeFormat === "linkedin" && (
              <FormatPane
                content={result.linkedinPost}
                fieldId={`li-${result.id}`}
                copied={copied}
                onCopy={() =>
                  copyToClipboard(result.linkedinPost, `li-${result.id}`)
                }
              />
            )}

            {activeFormat === "twitter" && (
              <div className="p-5 space-y-3">
                {result.twitterThread.map((tweet, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-black/30 border border-white/5 p-4 flex gap-3"
                  >
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-0.5 shrink-0 w-6">
                      {i + 1}
                    </div>
                    <div className="flex-1 text-sm leading-relaxed whitespace-pre-wrap">
                      {tweet}
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(tweet, `tw-${result.id}-${i}`)
                      }
                      className={cn(
                        "p-2 rounded-md transition shrink-0 self-start",
                        copied === `tw-${result.id}-${i}`
                          ? "text-green-400 bg-green-500/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                      )}
                    >
                      {copied === `tw-${result.id}-${i}` ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
                <div className="flex justify-end">
                  <button
                    onClick={() =>
                      copyToClipboard(twitterFull, `tw-all-${result.id}`)
                    }
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
                  >
                    {copied === `tw-all-${result.id}` ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    Copy full thread
                  </button>
                </div>
              </div>
            )}

            {activeFormat === "release" && (
              <FormatPane
                content={result.releaseNotes}
                fieldId={`rn-${result.id}`}
                copied={copied}
                onCopy={() =>
                  copyToClipboard(result.releaseNotes, `rn-${result.id}`)
                }
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <section className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          Past digests
        </h3>
        {list.isLoading ? (
          <div className="p-10 grid place-items-center rounded-2xl border border-white/5 bg-white/[0.02]">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : !list.data || list.data.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground rounded-2xl border-2 border-dashed border-border bg-muted/10">
            <Calendar className="h-6 w-6 text-muted-foreground/30 mx-auto mb-3" />
            No digests yet. Generate your first one above.
          </div>
        ) : (
          <ul className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
            {list.data.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-4 px-5 py-4 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors"
              >
                <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 grid place-items-center">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold capitalize">
                    {d.kind.replace("_", " ")}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(d.periodStart).toLocaleDateString()} →{" "}
                    {new Date(d.periodEnd).toLocaleDateString()} ·{" "}
                    {d.outputCount} {d.outputCount === 1 ? "PR" : "PRs"} ·{" "}
                    {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => detail.mutate(d.id)}
                  disabled={detail.isPending}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-white/5 transition disabled:opacity-50"
                >
                  {detail.isPending && detail.variables === d.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Open"
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FormatPane({
  content,
  fieldId,
  copied,
  onCopy,
}: {
  content: string;
  fieldId: string;
  copied: string | null;
  onCopy: () => void;
}) {
  return (
    <div className="p-5">
      <div className="rounded-xl bg-black/30 border border-white/5 p-5 text-sm leading-relaxed whitespace-pre-wrap font-mono">
        {content}
      </div>
      <div className="flex justify-end mt-3">
        <button
          onClick={onCopy}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition",
            copied === fieldId
              ? "text-green-400 bg-green-500/10"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5",
          )}
        >
          {copied === fieldId ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          Copy
        </button>
      </div>
    </div>
  );
}
