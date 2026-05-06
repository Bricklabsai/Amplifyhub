import { prisma } from "./prisma";
import crypto from "crypto";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "notifications@amplifyhub.ai";
const FROM_NAME = process.env.FROM_NAME || "AmplifyHub AI";
const UNSUBSCRIBE_URL = process.env.UNSUBSCRIBE_URL || "https://amplifyhub.ai/unsubscribe";

export interface EmailRecipient {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  id?: string;
  customData?: Record<string, any>;
}

export interface SendEmailOptions {
  to: EmailRecipient[];
  subject: string;
  content: string; // HTML content
  textContent?: string;
  campaignId?: string;
  maxRetries?: number;
}

/**
 * Generates a unique RSVP link for tracking
 */
function generateRsvpLink(campaignId: string, recipientId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/api/email/rsvp?token=${token}&campaignId=${campaignId}&recipientId=${recipientId}`;
}

/**
 * Generates an unsubscribe link
 */
function generateUnsubscribeLink(email: string): string {
  const token = crypto.randomBytes(16).toString("hex");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/api/email/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

/**
 * Personalizes content by replacing placeholders like {{firstName}}, {{lastName}}, etc.
 * Supports: {{firstName}}, {{lastName}}, {{name}}, {{company}}, {{email}},
 *           {{rsvpLink}}, {{unsubscribeUrl}}, {{currentDate}}, and custom variables
 */
function personalizeContent(content: string, recipient: EmailRecipient, campaignId?: string): string {
  let personalized = content;

  // Standard personalization
  personalized = personalized.replace(/{{firstName}}/g, recipient.firstName || "");
  personalized = personalized.replace(/{{lastName}}/g, recipient.lastName || "");
  personalized = personalized.replace(/{{name}}/g, `${recipient.firstName || ""} ${recipient.lastName || ""}`.trim() || "there");
  personalized = personalized.replace(/{{company}}/g, recipient.company || "");
  personalized = personalized.replace(/{{email}}/g, recipient.email);

  // Dynamic links
  if (personalized.includes("{{rsvpLink}}")) {
    const rsvpLink = recipient.id && campaignId ? generateRsvpLink(campaignId, recipient.id) : "#";
    personalized = personalized.replace(/{{rsvpLink}}/g, rsvpLink);
  }

  if (personalized.includes("{{unsubscribeUrl}}")) {
    const unsubscribeLink = generateUnsubscribeLink(recipient.email);
    personalized = personalized.replace(/{{unsubscribeUrl}}/g, unsubscribeLink);
  }

  // Current date
  personalized = personalized.replace(/{{currentDate}}/g, new Date().toLocaleDateString());

  // Custom data
  if (recipient.customData) {
    Object.entries(recipient.customData).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, "g");
      personalized = personalized.replace(placeholder, String(value || ""));
    });
  }

  return personalized;
}

export async function sendBulkEmails({ to, subject, content, textContent, campaignId, maxRetries = 3 }: SendEmailOptions) {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY is not set. Emails will not be sent.");
    return { success: false, error: "Email service not configured", sent: 0, failed: to.length, total: to.length, results: [] };
  }

  const results = [];
  let sentCount = 0;
  let failedCount = 0;

  // Send individually for personalization and tracking
  for (const recipient of to) {
    const personalizedHtml = personalizeContent(content, recipient, campaignId);
    const personalizedText = textContent ? personalizeContent(textContent, recipient, campaignId) : undefined;
    const personalizedSubject = personalizeContent(subject, recipient, campaignId);

    let success = false;
    let lastError: any = null;
    let retryCount = 0;

    // Retry logic
    while (retryCount < maxRetries && !success) {
      try {
        const response = await fetch(SENDGRID_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email: recipient.email }],
                subject: personalizedSubject,
                custom_args: {
                  campaignId: campaignId || "manual",
                  recipientId: recipient.id || "unknown",
                  timestamp: new Date().toISOString(),
                },
              },
            ],
            from: { email: FROM_EMAIL, name: FROM_NAME },
            replyTo: { email: FROM_EMAIL },
            content: [
              { type: "text/plain", value: personalizedText || personalizedHtml.replace(/<[^>]*>/g, "") },
              { type: "text/html", value: personalizedHtml },
            ],
            trackingSettings: {
              clickTracking: { enabled: true },
              openTracking: { enabled: true },
            },
          }),
        });

        if (response.ok) {
          success = true;
          sentCount++;
          results.push({ email: recipient.email, success: true, retryCount });

          // Track in DB if we have recipient and campaign info
          if (campaignId && recipient.id) {
            await prisma.emailCampaignRecipient.updateMany({
              where: {
                campaignId,
                contactId: recipient.id,
              },
              data: {
                sent: true,
                sentAt: new Date(),
              },
            });
          }
        } else {
          const errorData = await response.json();
          lastError = errorData;
          console.error(
            `Failed to send email to ${recipient.email} (attempt ${retryCount + 1}/${maxRetries}):`,
            errorData
          );
          retryCount++;

          // Exponential backoff before retry
          if (retryCount < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
        }
      } catch (error) {
        lastError = error;
        console.error(`Error sending email to ${recipient.email} (attempt ${retryCount + 1}/${maxRetries}):`, error);
        retryCount++;

        // Exponential backoff before retry
        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    }

    if (!success) {
      failedCount++;
      results.push({
        email: recipient.email,
        success: false,
        error: lastError,
        retryCount,
      });

      // Update recipient record to mark as failed after retries
      if (campaignId && recipient.id) {
        await prisma.emailCampaignRecipient.updateMany({
          where: {
            campaignId,
            contactId: recipient.id,
          },
          data: {
            sent: false,
          },
        });
      }
    }
  }

  // Update campaign status
  if (campaignId) {
    const status = failedCount === 0 ? "SENT" : failedCount > 0 && sentCount > 0 ? "PARTIAL_SUCCESS" : "FAILED";
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status,
        errorMessage: failedCount > 0 ? `Failed to send to ${failedCount} recipients` : null,
      },
    });
  }

  return {
    success: sentCount > 0,
    total: to.length,
    sent: sentCount,
    failed: failedCount,
    results,
  };
}
