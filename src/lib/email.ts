import { prisma } from "./prisma";
import { randomBytes } from "crypto";

const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "notifications@amplifyhub.ai";
const FROM_NAME = process.env.FROM_NAME || "AmplifyHub AI";

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
  const token = randomBytes(32).toString("hex");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/rsvp?token=${token}&campaignId=${campaignId}&recipientId=${recipientId}`;
}

/**
 * Generates an unsubscribe link
 */
function generateUnsubscribeLink(email: string): string {
  const token = randomBytes(16).toString("hex");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
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
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Emails will not be sent.");
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
        const response = await fetch(RESEND_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM_NAME ? `${FROM_NAME} <${FROM_EMAIL}>` : FROM_EMAIL,
            to: [recipient.email],
            subject: personalizedSubject,
            html: personalizedHtml,
            text: personalizedText,
            reply_to: FROM_EMAIL,
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

export async function sendEmail({ to, subject, content, textContent }: { to: string, subject: string, content: string, textContent?: string }) {
  return sendBulkEmails({
    to: [{ email: to }],
    subject,
    content,
    textContent
  });
}

export async function sendInviteEmail(email: string, teamName: string, inviterName: string, inviteUrl: string) {
  const subject = `You've been invited to join ${teamName} on AmplifyHub AI`;
  const content = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
      <h2 style="color: #4f46e5; margin-bottom: 24px;">Join the Team</h2>
      <p style="font-size: 16px; color: #1e293b; line-height: 1.5;">
        Hi there! <strong>${inviterName}</strong> has invited you to join their team <strong>${teamName}</strong> on AmplifyHub AI.
      </p>
      <p style="font-size: 16px; color: #1e293b; line-height: 1.5; margin-bottom: 32px;">
        As a team member, you'll be able to help manage social media posts, audience groups, and AI content generation.
      </p>
      <a href="${inviteUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
        Accept Invitation
      </a>
      <p style="font-size: 14px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;
  
  return sendEmail({ to: email, subject, content });
}
