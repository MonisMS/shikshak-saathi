import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/session";
import { getKitForTeacher } from "@/lib/scope";
import { SectionStatus, SectionType } from "@/generated/prisma/client";
import { ParentNote } from "@/lib/ai/schemas";
import { ParentNoteEditor } from "@/components/kit/parent-note-editor";

export default async function ParentNotePage(props: PageProps<"/kits/[id]/parent">) {
  const { id } = await props.params;
  const teacher = await requireTeacher();

  let kit;
  try {
    kit = await getKitForTeacher(id, teacher.id);
  } catch {
    notFound();
  }

  const section = kit.sections.find((s) => s.type === SectionType.PARENT_NOTE);
  const parsed = section?.status === SectionStatus.READY ? ParentNote.safeParse(section.content) : undefined;

  if (!parsed?.success) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          The parent note hasn&apos;t been generated yet — go back to the kit and add it, or wait for it to finish.
        </p>
        <Link href={`/kits/${kit.id}`} className="text-sm underline">
          Back to kit
        </Link>
      </div>
    );
  }

  return <ParentNoteEditor kitId={kit.id} data={parsed.data} />;
}
