import { Loader2, Check, Zap } from "lucide-react";
import { motion } from "framer-motion";
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
          <SegmentedSelect
            label="Seniority level"
            value={seniority}
            options={["junior", "mid", "senior", "staff"]}
            onChange={setSeniority}
            layoutId="settings-seniority-pill"
          />

          <SegmentedSelect
            label="Writing tone"
            value={tone}
            options={["direct", "storytelling", "technical"]}
            onChange={setTone}
            layoutId="settings-tone-pill"
          />

          <button
            onClick={handleSaveSettings}
            disabled={settingsSaving}
            className="group px-6 py-3 rounded-xl bg-foreground text-background text-sm font-bold disabled:opacity-50 transition-all duration-300 flex items-center gap-2 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5)] disabled:translate-y-0"
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
              const { logoutAllDevices } = await import("@/rpc");
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
              className="group px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-black transition-all duration-300 flex items-center gap-1.5 shadow-[0_12px_30px_-8px_rgba(59,130,246,0.5)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-8px_rgba(59,130,246,0.65)]"
            >
              <Zap className="h-3.5 w-3.5" /> UPGRADE ₹999
            </button>
          ) : (
            <button
              onClick={handlePortal}
              className="px-4 py-2 rounded-lg border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted/40 hover:border-border-strong transition"
            >
              Manage billing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Pill-style multi-option selector with a shared-layout animated indicator.
 * Used for the seniority + tone selectors. Pass a unique `layoutId` per
 * instance so the indicators don't share state across selectors.
 */
function SegmentedSelect({
  label,
  value,
  options,
  onChange,
  layoutId,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  layoutId: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 block">
        {label}
      </label>
      <div
        className={cn(
          "grid gap-2",
          options.length === 3 ? "grid-cols-3" : "grid-cols-4",
        )}
      >
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={cn(
                "relative py-2.5 rounded-xl text-xs font-bold capitalize transition-colors duration-200 border",
                active
                  ? "text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  transition={{
                    type: "spring",
                    bounce: 0.18,
                    duration: 0.45,
                  }}
                  className="absolute inset-0 -z-10 bg-foreground rounded-xl shadow-lg shadow-foreground/5"
                />
              )}
              <span className="relative z-10">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
