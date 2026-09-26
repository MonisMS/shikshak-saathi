"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebarNav, Logo } from "./app-sidebar";
import { useLanguage } from "./language-provider";
import { cn } from "@/lib/utils";

export function AppTopbar({ className, name, email }: { className?: string; name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const initials = name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "T";

  return (
    <header className={cn("flex h-[4.5rem] items-center gap-3 rounded-3xl bg-card px-3 md:px-4", className)}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="md:hidden" render={<Button variant="ghost" size="icon" aria-label="Open menu" />}>
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="px-6 py-5">
            <SheetTitle render={<div />}>
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <AppSidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <form
        className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-muted px-4 md:max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(query.trim() ? `/kits?q=${encodeURIComponent(query.trim())}` : "/kits");
        }}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lang === "hi" ? "किट खोजें" : "Search kits"}
          aria-label="Search kits"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
          className="flex h-11 items-center gap-1 rounded-full bg-muted px-4 text-sm transition-colors hover:bg-accent"
          aria-label="Switch language"
        >
          <span className={lang === "en" ? "font-semibold text-primary" : "text-muted-foreground"}>EN</span>
          <span className="text-muted-foreground">/</span>
          <span className={lang === "hi" ? "font-semibold text-primary" : "text-muted-foreground"}>हिं</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="hidden size-11 place-items-center rounded-full bg-accent sm:grid text-sm font-semibold text-accent-foreground">
            {initials}
          </span>
          <div className="hidden leading-tight lg:block">
            <p className="text-sm font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
