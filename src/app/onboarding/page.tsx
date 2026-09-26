import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/session";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

// Deliberately NOT under src/app/(app) — that layout redirects unonboarded
// teachers here, so nesting this page under it would infinite-loop.
export default async function OnboardingPage() {
  const teacher = await requireTeacher();
  if (teacher.onboarded) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg">
        <OnboardingWizard teacherName={teacher.name} />
      </div>
    </div>
  );
}
