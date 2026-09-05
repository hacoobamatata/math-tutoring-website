-- CreateTable
CREATE TABLE "TutoringSession" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutoringSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TutoringSession_studentId_startsAt_idx" ON "TutoringSession"("studentId", "startsAt");

-- CreateIndex
CREATE INDEX "TutoringSession_createdById_startsAt_idx" ON "TutoringSession"("createdById", "startsAt");

-- AddForeignKey
ALTER TABLE "TutoringSession" ADD CONSTRAINT "TutoringSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutoringSession" ADD CONSTRAINT "TutoringSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
