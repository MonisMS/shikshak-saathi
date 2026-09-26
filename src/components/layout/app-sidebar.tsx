"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LayoutDashboard, PlusCircle, BookOpen, NotebookPen, Settings, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { NAV_LINKS } from "./nav-links";
import { useLanguage } from "./language-provider";

const ICONS: Record<(typeof NAV_LINKS)[number]["href"], React.ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/kits/new": PlusCircle,
  "/kits": BookOpen,
  "/notes": NotebookPen,
  "/settings": Settings,
};

const GROUP_LABEL = {
  menu: { en: "Menu", hi: "मेनू" },
  general: { en: "General", hi: "सामान्य" },
} as const;

const itemClass = "relative flex items-center gap-3 py-2.5 pr-3 pl-6 text-[15px] transition-colors";

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        श
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">शिक्षक साथी</span>
    </Link>
  );
}

export function AppSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useLanguage();

  async function logout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="flex flex-col gap-6 py-2">
      {(["menu", "general"] as const).map((group) => (
        <div key={group}>
          <p className="mb-2 px-6 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {GROUP_LABEL[group][lang]}
          </p>
          <div className="flex flex-col">
            {NAV_LINKS.filter((l) => l.group === group).map((link) => {
              const Icon = ICONS[link.href];
              const active =
                pathname === link.href ||
                (link.href === "/notes" && pathname.startsWith("/notes/")) ||
                (link.href === "/kits" ? pathname.startsWith("/kits/") && pathname !== "/kits/new" : false);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  className={cn(itemClass, active ? "font-semibold text-foreground" : "text-sidebar-foreground hover:text-foreground")}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute top-1.5 bottom-1.5 left-0 w-1.5 rounded-r-full bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <Icon className={cn("size-5 shrink-0", active && "text-primary")} />
                  <span>{link.label[lang]}</span>
                </Link>
              );
            })}
            {group === "general" && (
              <button type="button" onClick={logout} className={cn(itemClass, "text-sidebar-foreground hover:text-foreground")}>
                <LogOut className="size-5 shrink-0" />
                <span>{lang === "hi" ? "लॉग आउट" : "Logout"}</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function SidebarPromo() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[radial-gradient(120%_90%_at_100%_100%,oklch(0.5_0.12_155),oklch(0.24_0.05_160)_70%)] p-4 text-white">
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-25" viewBox="0 0 200 160" preserveAspectRatio="none">
        <path d="M-10 120 C 60 60, 120 180, 210 90" stroke="white" strokeWidth="0.6" fill="none" />
        <path d="M-10 140 C 70 80, 130 190, 210 110" stroke="white" strokeWidth="0.6" fill="none" />
        <path d="M-10 100 C 50 40, 110 170, 210 70" stroke="white" strokeWidth="0.6" fill="none" />
      </svg>
      <span className="relative grid size-7 place-items-center rounded-full bg-white/15">
        <Sparkles className="size-3.5" />
      </span>
      <p className="relative mt-3 text-[15px] leading-snug font-semibold">One chapter in, a full kit out</p>
      <p className="relative mt-1 text-xs text-white/70">Plan, worksheet and quiz in about 90 seconds.</p>
      <Link
        href="/kits/new"
        className="relative mt-4 flex h-9 items-center justify-center rounded-full bg-[oklch(0.44_0.1_157)] text-sm font-medium transition-colors hover:bg-[oklch(0.5_0.11_157)]"
      >
        Create a kit
      </Link>
    </div>
  );
}
