import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { sendBulkEmails } from "@/lib/email";
import { processScheduledPosts, processScheduledEmails } from "@/lib/services/schedulerService";

/**
 * Publishes scheduled social media posts (Inngest Cloud optional path).
 * Production also uses Vercel Cron → GET /api/scheduler every minute.
 * Both paths call the same processScheduledPosts() with a processing lock.
 */
export const publishScheduledPosts = inngest.createFunction(
  { 
    id: "publish-scheduled-posts", 
    name: "Publish Scheduled Posts",
    triggers: [{ cron: "* * * * *" }]
  },
  async ({ step }) => {
    const results = await step.run("process-posts", async () => {
      return await processScheduledPosts();
    });

    return results;
  }
);

/**
 * Runs scheduled email campaigns
 * Runs every minute to check for campaigns that need to be run
 */
export const runScheduledCampaigns = inngest.createFunction(
  { 
    id: "run-scheduled-campaigns", 
    name: "Run Scheduled Campaigns",
    triggers: [{ cron: "* * * * *" }]
  },
  async ({ step }) => {
    const results = await step.run("process-emails", async () => {
      return await processScheduledEmails();
    });

    return results;
  }
);

/**
 * Sends weekly newsletter automation
 * Fetches latest posts and injects them into a newsletter template
 */
export const sendWeeklyNewsletter = inngest.createFunction(
  { 
    id: "send-weekly-newsletter", 
    name: "Send Weekly Newsletter" ,
    triggers: [{ cron: "0 9 * * 1" }]
  },
  async ({ step }) => {
    const scheduledCampaigns = await step.run("fetch-scheduled-campaigns", async () => {
      return await prisma.scheduledCampaign.findMany({
        where: {
          frequency: "WEEKLY",
          sourceType: "latest_posts",
          isActive: true,
          nextRunAt: { lte: new Date() },
        },
        include: { user: true },
      });
    });

    for (const campaign of scheduledCampaigns) {
      await step.run(`process-campaign-${campaign.id}`, async () => {
        try {
          const user = campaign.user;

          // Fetch latest posts from the past week
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const latestPosts = await prisma.post.findMany({
            where: {
              userId: user.id,
              status: "PUBLISHED",
              publishedAt: { gte: sevenDaysAgo },
            },
            orderBy: { publishedAt: "desc" },
            take: 5,
          });

          if (latestPosts.length === 0) {
            console.log(`No posts found for campaign ${campaign.id}`);
            return;
          }

          // Format posts for injection into template
          let injectedContent = campaign.htmlContent;
          const postsHtml = latestPosts
            .map(
              (post) => `
            <div style="margin-bottom: 20px; border: 1px solid #eee; padding: 15px; border-radius: 8px;">
              <h3 style="margin-top: 0;">${post.title}</h3>
              <p>${post.content.substring(0, 200)}...</p>
              <a href="${process.env.NEXTAUTH_URL}/posts/${post.id}" style="color: #7c3aed; text-decoration: none; font-weight: bold;">Read more →</a>
            </div>
          `
            )
            .join("");

          injectedContent = injectedContent.replace(/{{latest_posts}}/g, postsHtml);

          // Fetch audience for the campaign
          const recipientEmails = await prisma.contact.findMany({
            select: { id: true, email: true, firstName: true, lastName: true, company: true },
            where: {
              groups: {
                some: {
                  group: {
                    userId: user.id,
                  },
                },
              },
            },
          });

          if (recipientEmails.length === 0) {
            console.log(`No recipients found for campaign ${campaign.id}`);
            return;
          }

          // Send newsletter
          const result = await sendBulkEmails({
            to: recipientEmails.map((c) => ({
          id: c.id,
          email: c.email,
          firstName: c.firstName ?? undefined,
          lastName: c.lastName ?? undefined,
          company: c.company ?? undefined,
        })),
            subject: campaign.subject,
            content: injectedContent,
            campaignId: campaign.id,
          });

          // Update scheduled campaign
          const nextRun = new Date();
          nextRun.setDate(nextRun.getDate() + 7);

          await prisma.scheduledCampaign.update({
            where: { id: campaign.id },
            data: {
              lastRunAt: new Date(),
              nextRunAt: nextRun,
              failureCount: result.success ? 0 : campaign.failureCount + 1,
              lastError: result.failed > 0 ? `Failed to send to ${result.failed} recipients` : null,
            },
          });

          return { success: true, sent: result.sent, failed: result.failed };
        } catch (error) {
          console.error(`Error processing campaign ${campaign.id}:`, error);
          await prisma.scheduledCampaign.update({
            where: { id: campaign.id },
            data: {
              failureCount: campaign.failureCount + 1,
              lastError: String(error),
            },
          });
          throw error;
        }
      });
    }

    return { processed: scheduledCampaigns.length };
  }
);

/**
 * Sends event invitation with RSVP tracking links
 */
export const sendEventInvitations = inngest.createFunction(
  { 
    id: "send-event-invitations", 
    name: "Send Event Invitations",
    triggers: [{ event: "email/send-event-invitation" }]
  },
  async ({ event, step }) => {
    const { campaignId, templateId, recipientIds } = event.data as {
      campaignId: string;
      templateId: string;
      recipientIds: string[];
    };

    // Fetch template and campaign
    const template = await step.run("fetch-template", async () => {
      return await prisma.emailTemplate.findUnique({ where: { id: templateId } });
    });
    const campaign = await step.run("fetch-campaign", async () => {
      return await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    });

    if (!template || !campaign) {
      throw new Error("Template or campaign not found");
    }

    // Fetch recipients
    const recipients = await step.run("fetch-recipients", async () => {
      return await prisma.contact.findMany({
        where: { id: { in: recipientIds } },
        select: { id: true, email: true, firstName: true, lastName: true, company: true },
      });
    });

    // Send invitations with unique RSVP links
    const result = await step.run("send-invitations", async () => {
      return await sendBulkEmails({
        to: recipients.map((c: any) => ({
          id: c.id,
          email: c.email,
          firstName: c.firstName ?? undefined,
          lastName: c.lastName ?? undefined,
          company: c.company ?? undefined,
        })),
        subject: campaign.subject,
        content: template.htmlContent,
        campaignId,
      });
    });

    return {
      sent: result.sent,
      failed: result.failed,
      total: recipients.length,
    };
  }
);

/**
 * Retries failed campaigns
 */
export const retryCampaign = inngest.createFunction(
  { 
    id: "retry-campaign", 
    name: "Retry Failed Campaign",
    triggers: [{ event: "email/retry-campaign" }]
  },
  async ({ event, step }) => {
    const { campaignId } = event.data as { campaignId: string };

    const campaign = await step.run("fetch-campaign", async () => {
      return await prisma.emailCampaign.findUnique({
        where: { id: campaignId },
        include: {
          recipients: {
            where: { sent: false },
            include: { contact: true },
          },
        },
      });
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.retryCount >= campaign.maxRetries) {
      console.warn(
        `Campaign ${campaignId} has exceeded max retries (${campaign.maxRetries})`
      );
      return { skipped: true, reason: "Max retries exceeded" };
    }

    // Retry failed recipients
    const result = await step.run("retry-send", async () => {
      return await sendBulkEmails({
        to: campaign.recipients.map((r: any) => ({
          id: r.contact.id,
          email: r.contact.email,
          firstName: r.contact.firstName ?? undefined,
          lastName: r.contact.lastName ?? undefined,
          company: r.contact.company ?? undefined,
        })),
        subject: campaign.subject,
        content: campaign.htmlContent,
        campaignId,
        maxRetries: 2, // Fewer retries on retry attempt
      });
    });

    // Update campaign retry count
    await step.run("update-campaign", async () => {
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          retryCount: campaign.retryCount + 1,
          status: result.sent > 0 ? "SENT" : "FAILED",
        },
      });
    });

    return {
      sent: result.sent,
      failed: result.failed,
      total: campaign.recipients.length,
    };
  }
);
