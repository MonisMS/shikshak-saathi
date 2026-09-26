import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** UI-level status (P4.2) — a superset of the DB's SectionStatus: "checking" is a
 * transient client-only phase while /validate runs after every section finishes. */
export type SectionUiStatus = "queued" | "writing" | "checking" | "done" | "failed";

const CONFIG: Record<SectionUiStatus, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  queued: { label: "Queued", icon: Clock, className: "bg-muted text-muted-foreground" },
  writing: { label: "Writing…", icon: Loader2, className: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300" },
  checking: { label: "Checking…", icon: ShieldCheck, className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  done: { label: "Done", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  failed: { label: "Failed", icon: XCircle, className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" },
};

export function SectionStatusPill({ status }: { status: SectionUiStatus }) {
  const { label, icon: Icon, className } = CONFIG[status];
  return (
    <Badge className={cn("gap-1 font-normal", className)} variant="secondary">
      <Icon className={cn("size-3", status === "writing" && "animate-spin")} />
      {label}
    </Badge>
  );
}
