/*
  Warnings:

  - A unique constraint covering the columns `[availabilitySlotId]` on the table `TutoringSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "TutoringSession" ADD COLUMN     "availabilitySlotId" UUID;

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvailabilitySlot_createdById_startsAt_idx" ON "AvailabilitySlot"("createdById", "startsAt");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_startsAt_idx" ON "AvailabilitySlot"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "TutoringSession_availabilitySlotId_key" ON "TutoringSession"("availabilitySlotId");

-- AddForeignKey
ALTER TABLE "TutoringSession" ADD CONSTRAINT "TutoringSession_availabilitySlotId_fkey" FOREIGN KEY ("availabilitySlotId") REFERENCES "AvailabilitySlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
