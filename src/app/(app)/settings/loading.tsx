import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={3} maxWidth="max-w-lg" />;
}
