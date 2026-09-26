import { redirect } from "next/navigation";
import { AppSidebarNav } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { requireTeacher } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const teacher = await requireTeacher();
  if (!teacher.onboarded) redirect("/onboarding");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:block print:hidden">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4 font-semibold text-sidebar-foreground">
          शिक्षक साथी
        </div>
        <AppSidebarNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar className="print:hidden" />
        <main className="flex-1 p-4 md:p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
