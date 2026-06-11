-- Rename preserva os prompts existentes das clínicas
ALTER TABLE "clinics" RENAME COLUMN "systemPrompt" TO "clientInstructions";
ALTER TABLE "clinics" ALTER COLUMN "clientInstructions" DROP NOT NULL;

-- AlterTable
ALTER TABLE "clinics" ADD COLUMN "adminPrompt" TEXT,
ADD COLUMN "presetId" TEXT;

-- CreateTable
CREATE TABLE "presets" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrompt" TEXT NOT NULL,
    "allowedTopics" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "charCount" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "presetId" TEXT,
    "clinicId" TEXT,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "presets_name_key" ON "presets"("name");

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
