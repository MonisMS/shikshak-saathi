-- CreateTable
CREATE TABLE "ClassNote" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "audioSeconds" INTEGER,
    "summaryLanguage" TEXT NOT NULL DEFAULT 'auto',
    "transcript" TEXT NOT NULL,
    "summary" JSONB,
    "summaryError" TEXT,
    "myNotes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassNote_teacherId_createdAt_idx" ON "ClassNote"("teacherId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClassNote" ADD CONSTRAINT "ClassNote_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

