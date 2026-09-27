import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";

/** Public landing page a student is redirected to after submitting /t/[token]. */
export default async function TestSubmittedPage(props: PageProps<"/t/[token]/submitted">) {
  const { token } = await props.params;
  const sp = await props.searchParams;
  const score = typeof sp.score === "string" ? sp.score : null;

  const publication = await prisma.testPublication.findUnique({
    where: { token },
    select: { kit: { select: { title: true } } },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-10 dark:border-emerald-900 dark:bg-emerald-950/40">
        <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
        {publication && (
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/70 dark:text-emerald-300/70">
            {publication.kit.title}
          </p>
        )}
        <p className="text-base font-medium text-emerald-900 dark:text-emerald-200">
          {score ? `Submitted! Score: ${score}` : "Submitted — your teacher will grade this soon."}
        </p>
        <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80">जमा हो गया। You can close this page now.</p>
      </div>
    </div>
  );
}
