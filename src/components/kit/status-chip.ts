/** Shared kit status → chip mapping (dashboard + My kits list), F06/F51.
 * "Results in" isn't a DB status — it's derived from whether a QuizSession exists. */
export const STATUS_CHIP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  GENERATING: { label: "Generating", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  READY: { label: "Ready", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  RESULTS_IN: { label: "Results in", className: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" },
};

export function statusChipKey(status: string, hasResults: boolean): string {
  return hasResults ? "RESULTS_IN" : status;
}
