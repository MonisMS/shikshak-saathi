import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** UI-level status (P4.2) — a superset of the DB's SectionStatus: "checking" is a
 * transient client-only phase while /validate runs after every section finishes. */
export type SectionUiStatus = "queued" | "writing" | "checking" | "done" | "failed";

const CONFIG: Record<SectionUiStatus, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  queued: { label: "Queued", icon: Clock, className: "bg-muted text-muted-foreground" },
  writing: { label: "Writing…", icon: Loader2, className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  checking: { label: "Checking…", icon: ShieldCheck, className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  done: { label: "Done", icon: CheckCircle2, className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  failed: { label: "Failed", icon: XCircle, className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
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
