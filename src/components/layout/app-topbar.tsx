"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppSidebarNav } from "./app-sidebar";
import { cn } from "@/lib/utils";

export function AppTopbar({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className={cn("flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6", className)}>
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="md:hidden"
            render={<Button variant="ghost" size="icon" aria-label="Open menu" />}
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b border-sidebar-border px-4 py-3">
              <SheetTitle>शिक्षक साथी</SheetTitle>
            </SheetHeader>
            <AppSidebarNav onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="font-semibold">शिक्षक साथी</span>
      </div>

      {/* Language switch placeholder — wired to uiLanguage once i18n.ts (F29) lands */}
      <Button variant="outline" size="sm" disabled>
        EN / हिंदी
      </Button>
    </header>
  );
}
