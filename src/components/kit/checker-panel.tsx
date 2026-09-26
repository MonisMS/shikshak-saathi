import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ValidationRuleResult } from "@/lib/validate";

/** Checker panel (F22): pass/fail rule checklist, run after every section finishes (§10.6). */
export function CheckerPanel({ results }: { results: ValidationRuleResult[] | null }) {
  if (!results) {
    return (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Checker</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Runs automatically once every section is generated.</CardContent>
      </Card>
    );
  }

  const passed = results.filter((r) => r.ok).length;

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">
          Checker — {passed}/{results.length} passed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {results.map((r) => {
          const isWarning = !r.ok && r.severity === "warning";
          const Icon = r.ok ? CheckCircle2 : isWarning ? AlertTriangle : XCircle;
          return (
            <div
              key={r.rule}
              className={cn(
                "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm",
                r.ok
                  ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                  : isWarning
                    ? "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    : "bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <div>
                <span className="font-medium">{r.rule}</span>
                <span className="text-muted-foreground"> · {r.detail}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
