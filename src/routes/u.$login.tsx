import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/server/db";
import { users, profiles, outputs } from "@/server/schema";
import { eq, desc } from "drizzle-orm";
import { Github, Globe, Star, ShieldCheck, Zap, Activity } from "lucide-react";

const getProfileData = createServerFn({ method: "GET" })
  .validator((login: string) => login)
  .handler(async ({ data: login }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.githubLogin, login),
      with: {
        profile: true,
      },
    });

    if (!user) return null;

    const publicOutputs = await db.query.outputs.findMany({
      where: eq(outputs.userId, user.id),
      orderBy: [desc(outputs.createdAt)],
      limit: 10,
    });

    return { user, publicOutputs };
  });

export const Route = createFileRoute("/u/$login")({
  component: UserProfile,
});

function UserProfile() {
  const { login } = Route.useParams();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", login],
    queryFn: () => getProfileData({ data: login }),
  });

  if (isLoading) return <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">Fetching profile...</div>;
  if (!profile) return <div className="min-h-screen grid place-items-center bg-background text-destructive">User not found.</div>;

  const { user, publicOutputs } = profile;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/30 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={user.avatarUrl ?? ""} className="h-10 w-10 rounded-xl border border-border" alt={user.name ?? ""} />
            <div>
              <h1 className="text-sm font-bold tracking-tight">{user.name}</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">@{user.githubLogin} · {user.seniority} Engineer</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="p-2 rounded-lg border border-border hover:bg-surface/50 transition"><Github className="h-4 w-4" /></button>
            <button className="px-4 py-2 rounded-lg bg-foreground text-background text-xs font-bold hover:opacity-90 transition">Follow</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid md:grid-cols-[1.4fr_1fr] gap-12">
          {/* Main Feed */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Verified Impact</h2>
              <div className="flex gap-2">
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue/10 text-blue border border-blue/20">90D ANALYSIS</span>
              </div>
            </div>

            {publicOutputs.map((o) => (
              <div key={o.id} className="group p-6 rounded-2xl border border-border bg-surface/40 hover:border-border-strong transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{o.category}</div>
                  <div className="text-[10px] font-bold text-blue">SCORE: {o.impactScore}</div>
                </div>
                <h3 className="text-lg font-bold mb-3 group-hover:text-blue transition">{o.prTitle}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-6">
                  {o.linkedinPost1}
                </p>
                <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Verified SHA</span>
                  <span className="flex items-center gap-1.5"><Activity className="h-3 w-3" /> {o.complexityLevel} Complexity</span>
                </div>
              </div>
            ))}

            {publicOutputs.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl">
                <p className="text-muted-foreground italic">No public impacts shared yet.</p>
              </div>
            )}
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-8">
            <div className="p-8 rounded-3xl border border-border bg-gradient-to-br from-surface to-background relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue/10 blur-3xl rounded-full -mr-16 -mt-16" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">Intelligence Signals</h3>
              <div className="space-y-6">
                <StatRow icon={<Zap className="text-yellow-500" />} label="Contribution Rhythm" value="Elite" sub="Consistent peak Tues-Thurs" />
                <StatRow icon={<ShieldCheck className="text-green-500" />} label="Invisible Work" value="32%" sub="High ratio of infra/refactor" />
                <StatRow icon={<Star className="text-blue-500" />} label="Force Multiplier" value="84/100" sub="Top 5% of reviewers" />
              </div>
            </div>

            <div className="p-8 rounded-3xl border border-border bg-surface/30">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {profile.user.profile?.bio ?? "No bio available."}
              </p>
              {profile.user.profile?.customDomain && (
                <div className="mt-6 flex items-center gap-2 text-xs text-blue">
                  <Globe className="h-3 w-3" /> {profile.user.profile.customDomain}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatRow({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: string, sub: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-2 rounded-lg bg-background border border-border">{icon}</div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          <span className="text-sm font-bold">{value}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60">{sub}</p>
      </div>
    </div>
  );
}
