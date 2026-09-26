import { requireTeacher } from "@/lib/session";
import { listResources } from "@/lib/resources";
import { ResourceLibrary } from "@/components/resources/resource-library";

export default async function Page() {
  const teacher = await requireTeacher();
  return <ResourceLibrary group="recordings" initial={await listResources(teacher.id, "recordings")} />;
}
