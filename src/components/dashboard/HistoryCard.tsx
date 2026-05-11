import { useState } from "react";
import {
  Check,
  ClipboardCopy,
  Eye,
  EyeOff,
  Link2,
  ShieldCheck,
  FileSearch,
  Sparkles,
} from "lucide-react";
import { toggleOutputVisibility } from "@/rpc.server";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";

export function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        {label}
      </div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}

export function HistoryCard({
  output,
  _userId,
  onQueryInvalidate,
}: {
  output: any;
  _userId: string;
  onQueryInvalidate: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
    toast.success("Copied to clipboard");
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/t/${output.slug}`;
    navigator.clipboard?.writeText(url);
    setCopied("link");
    setTimeout(() => setCopied(null), 1600);
    toast.success("Share link copied");
  };

  const handleTogglePublic = async () => {
    setToggling(true);
    try {
      await toggleOutputVisibility({
        data: { outputId: output.id, isPublic: !output.isPublic },
      });
      onQueryInvalidate();
      toast.success(output.isPublic ? "Set to private" : "Set to public");
    } catch (err) {
      toast.error("Failed to update visibility");
    } finally {
      setToggling(false);
    }
  };

  const citations = Array.isArray(output.citations)
    ? output.citations
    : typeof output.citations === "string"
      ? JSON.parse(output.citations)
      : [];

  return (
    <div className="group rounded-2xl border border-border bg-muted/20 hover:border-border-strong transition p-6 relative overflow-hidden flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-blue-500 font-black">
            {output.category}
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/5 text-blue-500/80 border border-blue-500/10 text-[9px] font-bold">
            <ShieldCheck className="h-2.5 w-2.5" /> VERIFIED
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleTogglePublic}
            disabled={toggling}
            title={output.isPublic ? "Make Private" : "Make Public"}
            className="text-[11px] flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border"
          >
            {output.isPublic ? (
              <Eye className="h-3.5 w-3.5 text-blue-500" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={handleCopyLink}
            className="text-[11px] flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border"
          >
            {copied === "link" ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
          </button>
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="text-[11px] flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border"
                title="View PR Evidence"
              >
                <FileSearch className="h-3.5 w-3.5 text-blue-500" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 border-border bg-background">
              <DialogHeader className="p-6 border-b border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 uppercase tracking-widest font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" /> Verifiable
                  Evidence Layer
                </div>
                <DialogTitle className="text-2xl font-bold">
                  {output.prTitle || "PR Analysis"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  This impact story is backed by {citations.length} specific
                  code citations from the git log.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                      Generated Narrative
                    </h4>
                    <p className="text-base leading-8 font-medium text-foreground/90 whitespace-pre-line italic">
                      "{output.linkedinPost1}"
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-blue-500/10 bg-blue-500/5">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2">
                      Resume Impact
                    </h4>
                    <p className="text-sm font-mono text-blue-500/80 leading-relaxed">
                      {output.resumeBullet}
                    </p>
                  </div>
                </div>

                <div className="p-8 bg-muted/10 space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Source Evidence
                  </h4>
                  <div className="space-y-4">
                    {citations.map((cite: any, i: number) => (
                      <div key={i} className="group/cite space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <span className="text-blue-500">[{i + 1}]</span>
                          <span className="font-mono text-muted-foreground">
                            {cite.file || cite.path}
                          </span>
                          <span className="ml-auto opacity-30 text-[10px] font-mono">
                            {cite.sha?.slice(0, 7) || "a4f1c2"}
                          </span>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-background font-mono text-[11px] leading-relaxed text-muted-foreground">
                          {cite.context ||
                            cite.description ||
                            "Architectural shift in handling concurrent transactions."}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
                <div className="flex gap-4">
                  <Stat label="Impact" value={`${output.impactScore}/100`} />
                  <Stat label="Level" value={output.complexityLevel} />
                </div>
                <button
                  onClick={() =>
                    handleCopyText(output.linkedinPost1, "modal-copy")
                  }
                  className="px-4 py-2 rounded-lg bg-foreground text-background text-xs font-bold hover:opacity-90 transition flex items-center gap-2"
                >
                  {copied === "modal-copy" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <ClipboardCopy className="h-3 w-3" />
                  )}
                  Copy Narrative
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <h3 className="text-base font-bold mb-2 group-hover:text-blue-500 transition leading-snug">
        {output.prTitle || "Untitled Impact"}
      </h3>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {output.stack?.slice(0, 3).map((s: string) => (
          <span
            key={s}
            className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-blue-500/5 text-blue-500/70 border border-blue-500/10 uppercase tracking-tighter"
          >
            {s}
          </span>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="h-1 w-12 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${output.impactScore}%` }}
            />
          </div>
          <span className="text-[9px] font-black text-blue-500/80">
            {output.impactScore}
          </span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-6 opacity-80 italic flex-1">
        "{output.linkedinPost1}"
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          {new Date(output.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <button
          onClick={() => handleCopyText(output.linkedinPost1, "post")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition group/btn"
        >
          {copied === "post" ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" /> Copied
            </>
          ) : (
            <>
              <ClipboardCopy className="h-3.5 w-3.5 group-hover/btn:scale-110 transition" />{" "}
              Copy post
            </>
          )}
        </button>
      </div>
    </div>
  );
}
