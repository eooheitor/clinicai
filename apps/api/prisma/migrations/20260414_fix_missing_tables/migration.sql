-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MASTER', 'CLINIC');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLINIC',
    "clinicId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable clinics - add missing columns
ALTER TABLE "clinics"
  ADD COLUMN IF NOT EXISTS "adminPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "requiredDocs" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "companyInfo" TEXT,
  ADD COLUMN IF NOT EXISTS "aiObjective" TEXT NOT NULL DEFAULT 'agendamento';

-- AlterTable conversations - add missing columns
ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "humanMode" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "humanModeActivatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "triagemCompleta" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "triagemCompletaAt" TIMESTAMP(3);
