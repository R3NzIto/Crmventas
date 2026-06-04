-- CreateEnum
CREATE TYPE "LeadIntent" AS ENUM ('pricing', 'demo', 'buying_interest', 'support', 'spam', 'follow_up', 'other');

-- CreateEnum
CREATE TYPE "LeadUrgency" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "LeadQualification" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "isLead" BOOLEAN NOT NULL,
    "leadScore" INTEGER NOT NULL,
    "intent" "LeadIntent" NOT NULL,
    "urgency" "LeadUrgency" NOT NULL,
    "summary" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "suggestedTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadQualification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadQualification_messageId_key" ON "LeadQualification"("messageId");

-- CreateIndex
CREATE INDEX "LeadQualification_agencyId_idx" ON "LeadQualification"("agencyId");

-- CreateIndex
CREATE INDEX "LeadQualification_contactId_idx" ON "LeadQualification"("contactId");

-- CreateIndex
CREATE INDEX "LeadQualification_conversationId_idx" ON "LeadQualification"("conversationId");

-- CreateIndex
CREATE INDEX "LeadQualification_isLead_leadScore_idx" ON "LeadQualification"("isLead", "leadScore");

-- AddForeignKey
ALTER TABLE "LeadQualification" ADD CONSTRAINT "LeadQualification_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadQualification" ADD CONSTRAINT "LeadQualification_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadQualification" ADD CONSTRAINT "LeadQualification_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
