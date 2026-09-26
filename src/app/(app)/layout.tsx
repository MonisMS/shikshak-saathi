import { AppSidebarNav } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

// TODO(Ujjwal, P1.3): wrap with requireTeacher() and redirect to /onboarding
// when the session's onboarded flag is false, once src/lib/session.ts exists.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4 font-semibold text-sidebar-foreground">
          शिक्षक साथी
        </div>
        <AppSidebarNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
