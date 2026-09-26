import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={5} maxWidth="max-w-4xl" />;
}
