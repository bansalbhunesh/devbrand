import { Loader2, Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsTabProps {
  user: any;
  seniority: string;
  setSeniority: (s: any) => void;
  tone: string;
  setTone: (t: any) => void;
  handleSaveSettings: () => void;
  settingsSaving: boolean;
  handleUpgrade: () => void;
  handlePortal: () => void;
}

export function SettingsTab({
  user,
  seniority,
  setSeniority,
  tone,
  setTone,
  handleSaveSettings,
  settingsSaving,
  handleUpgrade,
  handlePortal,
}: SettingsTabProps) {
  return (
    <div className="max-w-lg space-y-10 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-6">Settings</h2>
        <div className="space-y-8">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 block">
              Seniority level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["junior", "mid", "senior", "staff"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSeniority(s as any)}
                  className={cn(
                    "py-2.5 rounded-xl text-xs font-bold capitalize transition border",
                    seniority === s
                      ? "bg-foreground text-background border-foreground shadow-lg shadow-foreground/5"
                      : "border-border text-muted-foreground hover:border-border-strong",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 block">
              Writing tone
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["direct", "storytelling", "technical"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t as any)}
                  className={cn(
                    "py-2.5 rounded-xl text-xs font-bold capitalize transition border",
                    tone === t
                      ? "bg-foreground text-background border-foreground shadow-lg shadow-foreground/5"
                      : "border-border text-muted-foreground hover:border-border-strong",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={settingsSaving}
            className="px-6 py-3 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2 shadow-xl shadow-foreground/5"
          >
            {settingsSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4 text-blue-500" />
            )}
            Save configuration
          </button>
        </div>
      </div>

      <div className="border-t border-border pt-10">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
          Privacy & Security
        </div>
        <div className="p-6 rounded-2xl border border-border bg-muted/20 space-y-4">
          <div>
            <p className="font-bold text-sm">Active Sessions</p>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">
              You are currently signed in with your GitHub account.
            </p>
          </div>
          <button
            onClick={async () => {
              const { logoutAllDevices } = await import("@/rpc.server");
              await logoutAllDevices();
              window.location.href = "/";
            }}
            className="px-4 py-2 rounded-lg border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/5 transition w-full text-center"
          >
            Sign out of all devices
          </button>
        </div>
      </div>

      <div className="border-t border-border pt-10">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
          Subscription Plan
        </div>
        <div className="flex items-center justify-between p-6 rounded-2xl border border-border bg-muted/20">
          <div>
            <p className="font-bold capitalize text-sm">{user.plan} plan</p>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">
              {user.plan === "free"
                ? `${user.generationsThisMonth ?? 0}/3 generations used`
                : "Unlimited impact stories"}
            </p>
          </div>
          {user.plan === "free" ? (
            <button
              onClick={handleUpgrade}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-black hover:opacity-90 transition flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
            >
              <Zap className="h-3.5 w-3.5" /> UPGRADE ₹999
            </button>
          ) : (
            <button
              onClick={handlePortal}
              className="px-4 py-2 rounded-lg border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted/40 transition"
            >
              Manage billing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
