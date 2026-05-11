import * as React from "react";
import { Loader2, ClipboardCopy, Filter } from "lucide-react";
import { HistoryCard } from "./HistoryCard";
import { cn } from "@/lib/utils";

interface HistoryTabProps {
  outputsLoading: boolean;
  outputs: any[];
  user: any;
  setTab: (tab: any) => void;
  qc: any;
}

export function HistoryTab({ outputsLoading, outputs, user, setTab, qc }: HistoryTabProps) {
  const [filter, setFilter] = React.useState<string>("all");
  
  const categories = React.useMemo(() => {
    return ["all", ...new Set(outputs?.map(o => o.category).filter(Boolean))];
  }, [outputs]);

  const filteredOutputs = React.useMemo(() => {
    return filter === "all" 
      ? outputs 
      : outputs?.filter(o => o.category === filter);
  }, [filter, outputs]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Generation History</h2>
          <p className="text-sm text-muted-foreground">Manage and share your verifiable engineering impact reports.</p>
        </div>
        
        {outputs && outputs.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            {categories.map((cat: any) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                  filter === cat
                    ? "bg-foreground text-background border-foreground"
                    : "bg-muted/50 text-muted-foreground border-border hover:border-border-strong"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {outputsLoading ? (
        <div className="h-96 rounded-3xl border border-border bg-muted/10 grid place-items-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Hydrating History...</p>
          </div>
        </div>
      ) : outputs && outputs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOutputs?.map((o: any) => (
            <HistoryCard 
              key={o.id} 
              output={o} 
              _userId={user.id} 
              onQueryInvalidate={() => qc.invalidateQueries({ queryKey: ["outputs", user.id] })} 
            />
          ))}
          {filteredOutputs?.length === 0 && (
            <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-border bg-muted/10">
               <Filter className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
               <p className="text-sm text-muted-foreground">No reports found for "{filter}"</p>
            </div>
          )}
        </div>
      ) : (
        <div className="py-32 text-center border-2 border-dashed border-border rounded-[2.5rem] bg-muted/10">
          <div className="h-16 w-16 rounded-[1.5rem] bg-muted grid place-items-center mx-auto mb-6">
            <ClipboardCopy className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-bold">No Impact Stories Yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto leading-relaxed">
            Paste a PR URL in the generate tab to create your first verifiable impact report.
          </p>
          <button 
            onClick={() => setTab("generate")} 
            className="mt-8 px-8 py-3 rounded-2xl bg-foreground text-background text-sm font-bold hover:opacity-90 transition shadow-xl shadow-foreground/5"
          >
            Create Your First Story
          </button>
        </div>
      )}
    </div>
  );
}
