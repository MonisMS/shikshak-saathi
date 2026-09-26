import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ValidationRuleResult } from "@/lib/validate";

/** Checker panel (F22): green/red rule checklist, run after every section finishes (§10.6). */
export function CheckerPanel({ results }: { results: ValidationRuleResult[] | null }) {
  if (!results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checker</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Runs automatically once every section is generated.</CardContent>
      </Card>
    );
  }

  const passed = results.filter((r) => r.ok).length;

  return (
    <Card>
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
                  ? "bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-200"
                  : isWarning
                    ? "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    : "bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200",
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
