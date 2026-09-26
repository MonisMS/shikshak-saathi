/** Shared kit status → chip mapping (dashboard + My kits list), F06/F51.
 * "Results in" isn't a DB status — it's derived from whether a QuizSession exists. */
export const STATUS_CHIP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  GENERATING: { label: "Generating", className: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300" },
  READY: { label: "Ready", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  FAILED: { label: "Failed", className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" },
  RESULTS_IN: { label: "Results in", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
};

export function statusChipKey(status: string, hasResults: boolean): string {
  return hasResults ? "RESULTS_IN" : status;
}
