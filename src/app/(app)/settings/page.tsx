import { requireTeacher } from "@/lib/session";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const teacher = await requireTeacher();

  return (
    <div className="max-w-lg">
      <SettingsForm
        initial={{
          name: teacher.name,
          school: teacher.school ?? "",
          district: teacher.district ?? "",
          preferredLanguage: teacher.preferredLanguage === "en" ? "en" : "hi",
          defaultPeriodMinutes: teacher.defaultPeriodMinutes ?? 40,
          lowResourceDefault: teacher.lowResourceDefault ?? true,
        }}
      />
    </div>
  );
}
