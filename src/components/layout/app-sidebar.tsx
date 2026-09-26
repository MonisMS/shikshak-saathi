"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  BookOpen,
  Users,
  Library,
  CalendarDays,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./nav-links";

const ICONS: Record<(typeof NAV_LINKS)[number]["href"], React.ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/kits/new": PlusCircle,
  "/kits": BookOpen,
  "/classrooms": Users,
  "/library": Library,
  "/schedule": CalendarDays,
  "/settings": Settings,
};

export function AppSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_LINKS.map((link) => {
        const Icon = ICONS[link.href];
        const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{link.label.en}</span>
          </Link>
        );
      })}
    </nav>
  );
}
