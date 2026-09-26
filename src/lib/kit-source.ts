import * as z from "zod";

/** One numbered "page" of teacher-uploaded material; numbered like a chapter so page refs and R3 still work. */
export const SourcePage = z.object({
  page: z.number().int().min(1).max(400),
  text: z.string(),
  source: z.string().optional(),
});
export type SourcePageData = z.infer<typeof SourcePage>;

const KitOptions = z
  .object({
    grade: z.number().int().optional(),
    subject: z.string().optional(),
    source: z.object({ name: z.string(), pages: z.array(SourcePage) }).optional(),
  })
  .passthrough();

export function readKitOptions(options: unknown): z.infer<typeof KitOptions> {
  const parsed = KitOptions.safeParse(options ?? {});
  return parsed.success ? parsed.data : {};
}
