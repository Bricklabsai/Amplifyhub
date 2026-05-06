import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Log the full payload for debugging (optional but helpful)
    // console.log("Received WhatsApp Webhook:", JSON.stringify(payload, null, 2));

    // Zernio often simplifies the Meta payload
    // We look for messages in the payload
    const messages = payload.data?.messages || payload.entry?.[0]?.changes?.[0]?.value?.messages || [];

    for (const message of messages) {
      const from = message.from;
      const type = message.type;

      // Specifically looking for Interactive Button replies (survey responses)
      if (type === "interactive") {
        const interactive = message.interactive;
        
        if (interactive?.type === "button_reply") {
          const buttonReply = interactive.button_reply;
          const buttonId = buttonReply?.id;
          const buttonTitle = buttonReply?.title;

          console.log("-----------------------------------------");
          console.log("INBOUND WHATSAPP INTERACTIVE BUTTON REPLY");
          console.log(`From: ${from}`);
          console.log(`Button ID: ${buttonId}`);
          console.log(`Button Title: ${buttonTitle}`);
          console.log("-----------------------------------------");
          
          // Here you would typically update your survey records in the database
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing WhatsApp webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// WhatsApp Webhook Verification (Meta standard)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode && token) {
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }
  
  return new Response("Not Found", { status: 404 });
}
