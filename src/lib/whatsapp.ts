import { prisma } from "./prisma";
import { decrypt } from "./crypto";

const ZERNIO_API_URL = "https://api.zernio.com/v1";

export async function sendWhatsAppTemplate({
  userId,
  to,
  templateName,
  languageCode = "en_US",
  components = [],
}: {
  userId: string;
  to: string;
  templateName: string;
  languageCode?: string;
  components?: unknown[];
}) {
  const config = await prisma.whatsAppConfig.findUnique({
    where: { userId },
  });

  if (!config) {
    throw new Error("WhatsApp configuration not found for this user.");
  }

  const decryptedToken = decrypt(config.accessToken);

  const response = await fetch(`${ZERNIO_API_URL}/whatsapp/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.ZERNIO_API_KEY}`,
    },
    body: JSON.stringify({
      phoneNumberId: config.phoneNumberId,
      wabaId: config.wabaId,
      accessToken: decryptedToken,
      to,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to send WhatsApp message via Zernio");
  }

  return data;
}
