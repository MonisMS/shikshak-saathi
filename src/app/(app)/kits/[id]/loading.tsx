import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_1fr]">
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="min-w-0 space-y-6">
        <Skeleton className="h-8 w-72" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
