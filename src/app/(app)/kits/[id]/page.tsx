import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/session";
import { getKitForTeacher } from "@/lib/scope";
import { KitGenerationView } from "@/components/kit/kit-generation-view";

export default async function KitPage(props: PageProps<"/kits/[id]">) {
  const { id } = await props.params;
  const autostart = (await props.searchParams).autostart === "1";

  // requireTeacher() redirects to /login on no session — must not be try/catch-wrapped
  // (Next's docs: redirect() throws and must propagate).
  const teacher = await requireTeacher();

  let kit;
  try {
    kit = await getKitForTeacher(id, teacher.id);
  } catch {
    notFound();
  }

  return (
    <KitGenerationView
      title={kit.title}
      kit={{
        id: kit.id,
        autostart,
        sections: kit.sections.map((s) => ({ type: s.type, status: s.status, content: s.content, error: s.error })),
      }}
    />
  );
}
