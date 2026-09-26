import { prisma } from "@/lib/db";
import { ExitTicketForm } from "@/components/exit-ticket/exit-ticket-form";

/** Public, unauthenticated — opened from a QR code after class. Only ever selects
 * non-sensitive fields (no teacherId, no content) since there's no session here. */
export default async function ExitTicketPage(props: PageProps<"/ticket/[kitId]">) {
  const { kitId } = await props.params;
  const kit = await prisma.lessonKit.findUnique({ where: { id: kitId }, select: { id: true, title: true } });

  if (!kit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">This link isn&apos;t valid anymore.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Exit ticket</p>
          <h1 className="text-lg font-semibold leading-snug">{kit.title}</h1>
        </div>
        <ExitTicketForm kitId={kit.id} />
      </div>
    </div>
  );
}
