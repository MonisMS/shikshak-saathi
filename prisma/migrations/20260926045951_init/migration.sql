-- CreateEnum
CREATE TYPE "Language" AS ENUM ('hi', 'en');

-- CreateEnum
CREATE TYPE "KitStatus" AS ENUM ('DRAFT', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('OBJECTIVES', 'LESSON_PLAN', 'BLACKBOARD', 'MULTIGRADE', 'WORKSHEET', 'EXIT_QUIZ', 'STARTER_QUIZ', 'SUMMATIVE', 'REMEDIAL', 'PARENT_NOTE');

-- CreateEnum
CREATE TYPE "SectionStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "RevisionSource" AS ENUM ('AI', 'TEACHER');

-- CreateEnum
CREATE TYPE "ResultMethod" AS ENUM ('TALLY', 'PER_STUDENT', 'CARD_SCAN', 'OMR');

-- CreateEnum
CREATE TYPE "MisconceptionStatus" AS ENUM ('OPEN', 'FIX_PLANNED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "FixStatus" AS ENUM ('SUGGESTED', 'ADDED', 'DONE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('SIGNED_UP', 'KIT_CREATED', 'SECTION_GENERATED', 'SECTION_REGENERATED', 'SECTION_EDITED', 'KIT_EXPORTED_PDF', 'KIT_EXPORTED_DOCX', 'QUIZ_RESULTS_RECORDED', 'FIX_ADDED', 'PARENT_NOTE_SHARED', 'VOICE_USED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "school" TEXT,
    "district" TEXT,
    "preferredLanguage" TEXT DEFAULT 'hi',
    "schoolType" TEXT,
    "uiLanguage" TEXT DEFAULT 'en',
    "defaultPeriodMinutes" INTEGER DEFAULT 40,
    "lowResourceDefault" BOOLEAN DEFAULT true,
    "onboarded" BOOLEAN DEFAULT false,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "grades" INTEGER[],
    "section" TEXT,
    "isMultiGrade" BOOLEAN NOT NULL DEFAULT false,
    "studentCount" INTEGER NOT NULL DEFAULT 30,
    "language" "Language" NOT NULL DEFAULT 'hi',
    "lowResource" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "rollNo" INTEGER NOT NULL,
    "grade" INTEGER,
    "displayName" TEXT,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "bookName" TEXT NOT NULL,
    "chapterNo" INTEGER NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleHi" TEXT,
    "sourceUrlEn" TEXT NOT NULL,
    "sourceUrlHi" TEXT,
    "pageStart" INTEGER NOT NULL,
    "pagesEn" JSONB NOT NULL,
    "pagesHi" JSONB,
    "summary" TEXT,
    "isSeeded" BOOLEAN NOT NULL DEFAULT true,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonKit" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classroomId" TEXT,
    "chapterId" TEXT,
    "title" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "status" "KitStatus" NOT NULL DEFAULT 'DRAFT',
    "periodMinutes" INTEGER NOT NULL DEFAULT 40,
    "dayNumber" INTEGER NOT NULL DEFAULT 1,
    "lowResource" BOOLEAN NOT NULL DEFAULT true,
    "targetGrades" INTEGER[],
    "topic" TEXT,
    "teacherNote" TEXT,
    "pageFrom" INTEGER,
    "pageTo" INTEGER,
    "classSize" INTEGER NOT NULL DEFAULT 40,
    "options" JSONB,
    "scheduledFor" TIMESTAMP(3),
    "diksha" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "validation" JSONB,
    "basedOnKitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitSection" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "type" "SectionType" NOT NULL,
    "status" "SectionStatus" NOT NULL DEFAULT 'PENDING',
    "content" JSONB,
    "version" INTEGER NOT NULL DEFAULT 0,
    "editedByTeacher" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionRevision" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "source" "RevisionSource" NOT NULL,
    "instruction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSession" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "classroomId" TEXT,
    "method" "ResultMethod" NOT NULL DEFAULT 'TALLY',
    "studentsPresent" INTEGER NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionTally" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "QuestionTally_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentResponse" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT,
    "rollNo" INTEGER NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionKey" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "StudentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Misconception" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "sessionId" TEXT,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "correction" TEXT,
    "questionIds" TEXT[],
    "studentCount" INTEGER NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,
    "rollNos" INTEGER[],
    "status" "MisconceptionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Misconception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixActivity" (
    "id" TEXT NOT NULL,
    "misconceptionId" TEXT NOT NULL,
    "targetKitId" TEXT,
    "title" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 5,
    "steps" JSONB NOT NULL,
    "materials" JSONB NOT NULL,
    "checkQuestion" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "status" "FixStatus" NOT NULL DEFAULT 'SUGGESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentNote" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "content" JSONB NOT NULL,
    "whatsappText" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "kitId" TEXT,
    "meta" JSONB,
    "minutesSavedEstimate" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationLog" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "kitId" TEXT,
    "sectionType" "SectionType",
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "fromCache" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "Classroom_teacherId_idx" ON "Classroom"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_classroomId_rollNo_key" ON "Student"("classroomId", "rollNo");

-- CreateIndex
CREATE INDEX "Chapter_grade_subject_idx" ON "Chapter"("grade", "subject");

-- CreateIndex
CREATE INDEX "LessonKit_teacherId_createdAt_idx" ON "LessonKit"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "LessonKit_chapterId_idx" ON "LessonKit"("chapterId");

-- CreateIndex
CREATE INDEX "LessonKit_classroomId_scheduledFor_idx" ON "LessonKit"("classroomId", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "KitSection_kitId_type_key" ON "KitSection"("kitId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "SectionRevision_sectionId_version_key" ON "SectionRevision"("sectionId", "version");

-- CreateIndex
CREATE INDEX "QuizSession_kitId_idx" ON "QuizSession"("kitId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionTally_sessionId_questionId_optionKey_key" ON "QuestionTally"("sessionId", "questionId", "optionKey");

-- CreateIndex
CREATE INDEX "StudentResponse_studentId_idx" ON "StudentResponse"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentResponse_sessionId_rollNo_questionId_key" ON "StudentResponse"("sessionId", "rollNo", "questionId");

-- CreateIndex
CREATE INDEX "Misconception_kitId_percent_idx" ON "Misconception"("kitId", "percent");

-- CreateIndex
CREATE INDEX "FixActivity_targetKitId_idx" ON "FixActivity"("targetKitId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentNote_shareToken_key" ON "ParentNote"("shareToken");

-- CreateIndex
CREATE INDEX "ParentNote_kitId_idx" ON "ParentNote"("kitId");

-- CreateIndex
CREATE INDEX "ActivityLog_teacherId_createdAt_idx" ON "ActivityLog"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_teacherId_type_idx" ON "ActivityLog"("teacherId", "type");

-- CreateIndex
CREATE INDEX "GenerationLog_teacherId_createdAt_idx" ON "GenerationLog"("teacherId", "createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonKit" ADD CONSTRAINT "LessonKit_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonKit" ADD CONSTRAINT "LessonKit_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonKit" ADD CONSTRAINT "LessonKit_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonKit" ADD CONSTRAINT "LessonKit_basedOnKitId_fkey" FOREIGN KEY ("basedOnKitId") REFERENCES "LessonKit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitSection" ADD CONSTRAINT "KitSection_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "LessonKit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionRevision" ADD CONSTRAINT "SectionRevision_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "KitSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "LessonKit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionTally" ADD CONSTRAINT "QuestionTally_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuizSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResponse" ADD CONSTRAINT "StudentResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuizSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResponse" ADD CONSTRAINT "StudentResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Misconception" ADD CONSTRAINT "Misconception_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "LessonKit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Misconception" ADD CONSTRAINT "Misconception_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuizSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixActivity" ADD CONSTRAINT "FixActivity_misconceptionId_fkey" FOREIGN KEY ("misconceptionId") REFERENCES "Misconception"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixActivity" ADD CONSTRAINT "FixActivity_targetKitId_fkey" FOREIGN KEY ("targetKitId") REFERENCES "LessonKit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentNote" ADD CONSTRAINT "ParentNote_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "LessonKit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationLog" ADD CONSTRAINT "GenerationLog_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationLog" ADD CONSTRAINT "GenerationLog_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "LessonKit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
