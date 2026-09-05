-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TUTOR', 'ADMIN');

-- AlterTable
ALTER TABLE "AppUser" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'STUDENT';
