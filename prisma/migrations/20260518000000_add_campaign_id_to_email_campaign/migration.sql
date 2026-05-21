-- AlterTable
ALTER TABLE "EmailCampaign" ADD COLUMN "campaignId" TEXT;

-- AddForeignKey
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
