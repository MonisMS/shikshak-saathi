-- CreateTable
CREATE TABLE "TestPublication" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "sectionType" "SectionType" NOT NULL,
    "token" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "gradingInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSubmission" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "perQuestion" JSONB,
    "autoMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiMarks" DOUBLE PRECISION,
    "maxMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evaluatedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestPublication_token_key" ON "TestPublication"("token");

-- CreateIndex
CREATE INDEX "TestPublication_kitId_idx" ON "TestPublication"("kitId");

-- CreateIndex
CREATE INDEX "TestPublication_teacherId_idx" ON "TestPublication"("teacherId");

-- CreateIndex
CREATE INDEX "TestSubmission_publicationId_idx" ON "TestSubmission"("publicationId");

-- AddForeignKey
ALTER TABLE "TestPublication" ADD CONSTRAINT "TestPublication_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "LessonKit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPublication" ADD CONSTRAINT "TestPublication_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSubmission" ADD CONSTRAINT "TestSubmission_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "TestPublication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
