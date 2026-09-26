import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  note,
  href,
  tooltip,
  hero = false,
}: {
  label: string;
  value: string | number;
  note: string;
  href: string;
  tooltip?: string;
  hero?: boolean;
}) {
  return (
    <Link
      href={href}
      title={tooltip}
      className={cn(
        "group flex flex-col rounded-3xl p-5 transition-transform duration-200 hover:-translate-y-0.5",
        hero
          ? "bg-[radial-gradient(130%_120%_at_0%_0%,oklch(0.5_0.12_155),oklch(0.33_0.08_158)_75%)] text-white shadow-[0_18px_40px_-22px_oklch(0.44_0.1_157)]"
          : "bg-card ring-1 ring-foreground/[0.04]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-[15px] font-medium", hero ? "text-white/90" : "text-foreground")}>{label}</p>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full transition-transform duration-200 group-hover:rotate-45",
            hero ? "bg-white text-primary" : "border border-foreground/60 text-foreground",
          )}
        >
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <p className="mt-4 text-5xl font-semibold tracking-tight">{value}</p>
      <p className={cn("mt-3 text-xs", hero ? "text-[oklch(0.88_0.1_150)]" : "text-primary")}>{note}</p>
    </Link>
  );
}
