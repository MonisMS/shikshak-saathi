-- CreateTable
CREATE TABLE "TeachingResource" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "grade" INTEGER,
    "subject" TEXT,
    "sourceUrl" TEXT,
    "fileName" TEXT,
    "audioSeconds" INTEGER,
    "pages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachingResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeachingResource_teacherId_kind_createdAt_idx" ON "TeachingResource"("teacherId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "TeachingResource" ADD CONSTRAINT "TeachingResource_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
