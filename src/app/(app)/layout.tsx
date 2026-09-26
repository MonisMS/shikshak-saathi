import { redirect } from "next/navigation";
import { AppSidebarNav, Logo, SidebarPromo } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { LanguageProvider } from "@/components/layout/language-provider";
import { requireTeacher } from "@/lib/session";
import type { Lang } from "@/lib/i18n";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const teacher = await requireTeacher();
  if (!teacher.onboarded) redirect("/onboarding");

  const initialLang: Lang = teacher.uiLanguage === "hi" ? "hi" : "en";

  return (
    <LanguageProvider initialLang={initialLang}>
      <div className="flex min-h-screen gap-3 p-3 md:gap-4 md:p-4 print:block print:p-0">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-3xl bg-sidebar md:flex print:hidden">
          <div className="px-6 pt-7 pb-8">
            <Logo />
          </div>
          <AppSidebarNav />
          <div className="mt-auto p-4">
            <SidebarPromo />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-3 md:gap-4">
          <AppTopbar className="print:hidden" name={teacher.name} email={teacher.email} />
          <main className="flex-1 rounded-3xl p-1 md:p-2 print:p-0">{children}</main>
        </div>
      </div>
    </LanguageProvider>
  );
}
