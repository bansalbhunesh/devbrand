import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listTrackedRepos,
  registerTrackedRepo,
  rotateWebhookSecret,
  deleteTrackedRepo,
} from "@/rpc";
import {
  Loader2,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Github,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type TrackedRepo = {
  id: string;
  owner: string;
  repo: string;
  autoPublish: boolean;
  createdAt: string;
};

export function TrackedReposTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["tracked-repos"],
    queryFn: () => listTrackedRepos(),
  });

  const repos: TrackedRepo[] = (data as any)?.repos ?? [];
  const webhookUrl: string = (data as any)?.webhookUrl ?? "";

  const [adding, setAdding] = useState(false);
  const [pasted, setPasted] = useState("");
  // Secret revealed exactly once on creation/rotation. After the user
  // dismisses this panel the secret is gone from the client forever — they
  // must rotate to get a new one.
  const [revealed, setRevealed] = useState<{
    repoId: string;
    secret: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [secretVisible, setSecretVisible] = useState(false);

  const register = useMutation({
    mutationFn: async (input: { owner: string; repo: string }) =>
      registerTrackedRepo({ data: input }),
    onSuccess: (res: any) => {
      toast.success(`Tracking ${res.owner}/${res.repo}`);
      setRevealed({ repoId: res.id, secret: res.webhookSecret });
      setSecretVisible(false);
      setAdding(false);
      setPasted("");
      qc.invalidateQueries({ queryKey: ["tracked-repos"] });
    },
    onError: (e: any) => {
      const msg =
        e?.message === "ALREADY_TRACKED"
          ? "You're already tracking that repo."
          : "Couldn't register that repo — check the format owner/repo.";
      toast.error(msg);
    },
  });

  const rotate = useMutation({
    mutationFn: async (id: string) => rotateWebhookSecret({ data: { id } }),
    onSuccess: (res: any) => {
      setRevealed({ repoId: res.id, secret: res.webhookSecret });
      setSecretVisible(false);
      toast.success("Secret rotated — paste the new one into GitHub");
    },
    onError: () => toast.error("Couldn't rotate secret"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteTrackedRepo({ data: { id } }),
    onSuccess: () => {
      toast.success("Repo removed");
      qc.invalidateQueries({ queryKey: ["tracked-repos"] });
    },
    onError: () => toast.error("Couldn't remove repo"),
  });

  const parseAndSubmit = () => {
    // Accept "owner/repo", "github.com/owner/repo", or a full
    // https://github.com/owner/repo URL. Trailing slashes / .git suffixes
    // get stripped silently because users paste from the address bar.
    const raw = pasted
      .trim()
      .replace(/\.git$/, "")
      .replace(/\/+$/, "");
    const m =
      raw.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/) ||
      raw.match(/^([^/]+)\/([^/]+)$/);
    if (!m) {
      toast.error('Format must be "owner/repo" or a github.com URL');
      return;
    }
    register.mutate({ owner: m[1], repo: m[2] });
  };

  const copyToClipboard = (value: string, fieldId: string) => {
    navigator.clipboard.writeText(value).then(
      () => {
        setCopiedField(fieldId);
        setTimeout(
          () => setCopiedField((c) => (c === fieldId ? null : c)),
          1600,
        );
      },
      () => toast.error("Couldn't copy to clipboard"),
    );
  };

  return (
    <div className="max-w-3xl space-y-10 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight mb-2">
          Tracked repositories
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          Add a repo here and DevBrand will watch for merged pull requests. When
          one lands, the engine runs automatically and a draft post appears in
          your History tab.
        </p>
      </header>

      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-2xl border border-blue-500/30 bg-blue-500/[0.04] p-6"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-1">
                  One-time reveal
                </div>
                <h3 className="text-base font-bold">
                  Configure GitHub webhook with these two values
                </h3>
                <p className="text-[12px] text-muted-foreground mt-1">
                  We won't show the secret again. Rotate any time if it leaks.
                </p>
              </div>
              <button
                onClick={() => setRevealed(null)}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            </div>

            <div className="space-y-3">
              <SecretRow
                label="Payload URL"
                value={webhookUrl}
                masked={false}
                fieldId="reveal-url"
                copiedField={copiedField}
                onCopy={() => copyToClipboard(webhookUrl, "reveal-url")}
              />
              <SecretRow
                label="Secret"
                value={revealed.secret}
                masked={!secretVisible}
                fieldId="reveal-secret"
                copiedField={copiedField}
                onCopy={() => copyToClipboard(revealed.secret, "reveal-secret")}
                onToggleVisibility={() => setSecretVisible((v) => !v)}
              />
            </div>

            <div className="mt-5 rounded-xl bg-black/30 border border-white/5 p-4 text-[12px] text-muted-foreground leading-relaxed">
              In your repo →{" "}
              <span className="text-foreground font-medium">
                Settings → Webhooks → Add webhook
              </span>
              . Set <em>Content type</em> to{" "}
              <code className="text-blue-400">application/json</code>, paste
              both fields, and select{" "}
              <em className="text-foreground">Pull requests</em> as the only
              event.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            {repos.length} {repos.length === 1 ? "Repo" : "Repos"}
          </div>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" /> Track repo
            </button>
          )}
        </div>

        {adding && (
          <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row gap-3 items-stretch">
            <input
              autoFocus
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="owner/repo or https://github.com/owner/repo"
              className="flex-1 px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-sm focus:outline-none focus:border-blue-500/40 transition-colors"
              onKeyDown={(e) => e.key === "Enter" && parseAndSubmit()}
            />
            <div className="flex gap-2">
              <button
                onClick={parseAndSubmit}
                disabled={register.isPending}
                className="px-5 py-3 rounded-xl bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50 transition flex items-center gap-2"
              >
                {register.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Github className="h-3.5 w-3.5" />
                )}
                Add
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setPasted("");
                }}
                className="px-4 py-3 rounded-xl border border-white/10 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-10 grid place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : repos.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No tracked repos yet. Add one and DevBrand will draft a post the
            moment a PR is merged.
          </div>
        ) : (
          <ul>
            {repos.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-4 p-5 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors"
              >
                <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 grid place-items-center">
                  <Github className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {r.owner}/{r.repo}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Added {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => rotate.mutate(r.id)}
                    disabled={rotate.isPending}
                    title="Rotate webhook secret"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition disabled:opacity-50"
                  >
                    {rotate.isPending && rotate.variables === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Stop tracking ${r.owner}/${r.repo}? Future merges won't auto-draft.`,
                        )
                      ) {
                        remove.mutate(r.id);
                      }
                    }}
                    disabled={remove.isPending}
                    title="Remove repo"
                    className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SecretRow({
  label,
  value,
  masked,
  fieldId,
  copiedField,
  onCopy,
  onToggleVisibility,
}: {
  label: string;
  value: string;
  masked: boolean;
  fieldId: string;
  copiedField: string | null;
  onCopy: () => void;
  onToggleVisibility?: () => void;
}) {
  const displayed = masked ? "•".repeat(Math.min(value.length, 40)) : value;
  const copied = copiedField === fieldId;
  return (
    <div className="rounded-xl bg-black/30 border border-white/5 p-3 flex items-center gap-3">
      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground w-24 shrink-0">
        {label}
      </div>
      <code className="flex-1 text-[12px] text-foreground font-mono truncate">
        {displayed}
      </code>
      {onToggleVisibility && (
        <button
          onClick={onToggleVisibility}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
          title={masked ? "Show" : "Hide"}
        >
          {masked ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </button>
      )}
      <button
        onClick={onCopy}
        className={cn(
          "p-2 rounded-md transition",
          copied
            ? "text-green-400 bg-green-500/10"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5",
        )}
        title="Copy"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
