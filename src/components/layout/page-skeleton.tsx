import { Skeleton } from "@/components/ui/skeleton";

/** Generic route-level loading UI (used by every `loading.tsx`). Next shows this
 * instantly on navigation while the destination page's server component awaits its
 * data — without it, a slow query just leaves the previous page frozen, which is
 * most of what "choppy" navigation actually is. */
export function PageSkeleton({ cards = 3, maxWidth = "max-w-3xl" }: { cards?: number; maxWidth?: string }) {
  return (
    <div className={`${maxWidth} space-y-6`}>
      <Skeleton className="h-8 w-64" />
      <div className="space-y-3">
        {Array.from({ length: cards }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
