import { prisma } from "./prisma";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "notifications@amplifyhub.ai";
const FROM_NAME = process.env.FROM_NAME || "AmplifyHub AI";

export interface EmailRecipient {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  id?: string;
}

export interface SendEmailOptions {
  to: EmailRecipient[];
  subject: string;
  content: string; // HTML content
  textContent?: string;
  campaignId?: string;
}

/**
 * Personalizes content by replacing placeholders like {{firstName}}, {{lastName}}, etc.
 */
function personalizeContent(content: string, recipient: EmailRecipient): string {
  let personalized = content;
  personalized = personalized.replace(/{{firstName}}/g, recipient.firstName || "");
  personalized = personalized.replace(/{{lastName}}/g, recipient.lastName || "");
  personalized = personalized.replace(/{{name}}/g, `${recipient.firstName || ""} ${recipient.lastName || ""}`.trim() || "there");
  personalized = personalized.replace(/{{company}}/g, recipient.company || "");
  personalized = personalized.replace(/{{email}}/g, recipient.email);
  return personalized;
}

export async function sendBulkEmails({ to, subject, content, textContent, campaignId }: SendEmailOptions) {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY is not set. Emails will not be sent.");
    return { success: false, error: "Email service not configured" };
  }

  const results = [];

  // Send individually for personalization and tracking
  for (const recipient of to) {
    const personalizedHtml = personalizeContent(content, recipient);
    const personalizedText = textContent ? personalizeContent(textContent, recipient) : undefined;
    const personalizedSubject = personalizeContent(subject, recipient);

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
              },
            },
          ],
          from: { email: FROM_EMAIL, name: FROM_NAME },
          content: [
            { type: "text/plain", value: personalizedText || personalizedHtml.replace(/<[^>]*>/g, "") },
            { type: "text/html", value: personalizedHtml },
          ],
        }),
      });

      if (response.ok) {
        results.push({ email: recipient.email, success: true });
        
        // Track in DB if we have recipient and campaign info
        if (campaignId && recipient.id) {
            await prisma.emailCampaignRecipient.updateMany({
                where: {
                    campaignId,
                    contactId: recipient.id
                },
                data: {
                    sent: true,
                    sentAt: new Date()
                }
            });
        }
      } else {
        const errorData = await response.json();
        console.error(`Failed to send email to ${recipient.email}:`, errorData);
        results.push({ email: recipient.email, success: false, error: errorData });
      }
    } catch (error) {
      console.error(`Error sending email to ${recipient.email}:`, error);
      results.push({ email: recipient.email, success: false, error });
    }
  }

  return {
    success: results.some(r => r.success),
    total: to.length,
    sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}
