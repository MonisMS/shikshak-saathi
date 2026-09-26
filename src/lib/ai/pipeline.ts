import { SectionType } from "@/generated/prisma/client";

/**
 * Which sections a section depends on (§10.1). A plain object map — the client
 * runs OBJECTIVES, then LESSON_PLAN, then everything else in parallel once its
 * deps are READY.
 */
export const SECTION_DEPS: Record<SectionType, SectionType[]> = {
  [SectionType.OBJECTIVES]: [],
  [SectionType.LESSON_PLAN]: [SectionType.OBJECTIVES],
  [SectionType.WORKSHEET]: [SectionType.OBJECTIVES, SectionType.LESSON_PLAN],
  [SectionType.EXIT_QUIZ]: [SectionType.OBJECTIVES, SectionType.LESSON_PLAN],
  [SectionType.MULTIGRADE]: [SectionType.OBJECTIVES, SectionType.LESSON_PLAN],
  [SectionType.STARTER_QUIZ]: [SectionType.LESSON_PLAN],
  [SectionType.BLACKBOARD]: [SectionType.LESSON_PLAN],
  [SectionType.REMEDIAL]: [SectionType.LESSON_PLAN],
  [SectionType.PARENT_NOTE]: [SectionType.LESSON_PLAN],
  [SectionType.SUMMATIVE]: [SectionType.OBJECTIVES],
};
