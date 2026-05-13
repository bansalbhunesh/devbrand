import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getProfileData } from "@/rpc";
import { Activity, ArrowRight, UserX } from "lucide-react";
import * as React from "react";
import { motion } from "framer-motion";
import { UserProfileView } from "@/modules/users/ui/UserProfileView";

export const Route = createFileRoute("/u/$login")({
  component: UserProfilePage,
});

function UserProfilePage() {
  const { login } = Route.useParams();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", login],
    queryFn: () => getProfileData({ data: login }),
  });

  if (isLoading)
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-8">
          <div className="relative h-20 w-20 grid place-items-center">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-blue-500/40"
              animate={{ scale: [1, 1.4, 1.8], opacity: [0.5, 0.2, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-blue-500/40"
              animate={{ scale: [1, 1.4, 1.8], opacity: [0.5, 0.2, 0] }}
              transition={{ duration: 2.8, delay: 1.4, repeat: Infinity, ease: "easeOut" }}
            />
            <div className="relative h-12 w-12 rounded-full bg-blue-500/10 border border-blue-500/30 grid place-items-center">
              <Activity className="h-5 w-5 text-blue-500/80" />
            </div>
          </div>
          <span className="text-[10px] font-black tracking-[0.4em] text-muted-foreground uppercase">
            Analyzing credentials...
          </span>
        </div>
      </div>
    );

  if (!profile)
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="max-w-md text-center">
          <div className="relative h-16 w-16 mx-auto mb-6 grid place-items-center">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-white/15"
              animate={{ scale: [1, 1.35, 1.7], opacity: [0.4, 0.15, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut" }}
            />
            <div className="relative h-14 w-14 rounded-full bg-muted border border-border grid place-items-center">
              <UserX className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-black mb-3 tracking-tighter">
            Engineer not in registry.
          </h1>
          <p className="text-muted-foreground mb-8 font-medium leading-relaxed">
            We couldn't find a verified DevBrand profile for{" "}
            <span className="text-foreground font-bold">@{login}</span>.
          </p>
          <Link
            to="/"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-foreground text-background font-black text-sm transition-all duration-300 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.4)] hover:-translate-y-0.5"
          >
            Back to Registry
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    );

  return <UserProfileView user={profile.user} publicOutputs={profile.publicOutputs} />;
}
