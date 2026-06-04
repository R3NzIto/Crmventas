-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED', 'SNOOZED');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "unreadCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "readAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AgencyChannelConfig" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "emailConfig" JSONB,
    "smsConfig" JSONB,
    "whatsappConfig" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyChannelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgencyChannelConfig_agencyId_key" ON "AgencyChannelConfig"("agencyId");

-- CreateIndex
CREATE INDEX "Conversation_assignedToId_idx" ON "Conversation"("assignedToId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyChannelConfig" ADD CONSTRAINT "AgencyChannelConfig_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
