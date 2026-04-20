import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MOCK_RESPONSES: Record<string, string[]> = {
  FACEBOOK: [
    "🚀 Exciting news! We're thrilled to share our latest update with our incredible community. Your support has been the driving force behind our growth. Drop a ❤️ if this resonates with you! #Community #Growth #Grateful",
    "💡 Did you know? The most successful brands on social media share authenticity over perfection. We're embracing that philosophy every day. What authentic story can YOU share today? #Authentic #Marketing",
  ],
  TWITTER: [
    "Big announcement dropping soon 👀 Stay tuned! #ComingSoon #Excited",
    "Your brand story matters. Tell it. Own it. Amplify it. 🔥 #Branding #Marketing",
  ],
  INSTAGRAM: [
    "✨ Every great story starts with a single step. We took ours and never looked back. Where did yours begin? Share below 👇 #Journey #Motivation #Success",
    "Swipe to see the transformation 🙌 Before & after — proof that consistency pays off. Tag someone who needs to see this! #Transformation #Glow",
  ],
  LINKEDIN: [
    "I've been in this industry for over a decade, and here's what I've learned: your network is your net worth. Investing in relationships — not just transactions — has been the single most impactful decision of my career. What's your biggest career lesson? #Leadership #Networking #ProfessionalGrowth",
    "Proud to announce that our team has achieved a significant milestone. None of this would have been possible without our dedicated team, loyal clients, and supportive partners. Here's to the journey ahead. #Milestone #TeamWork #Growth",
  ],
  TIKTOK: [
    "POV: You just discovered the tool that 10x'd your social media reach 📱✨ #socialmediatips #growthhack #fyp",
    "Doing this challenge for 30 days changed everything 💪 Day 1 vs Day 30 #30daychallenge #transformation #fyp",
  ],
  YOUTUBE: [
    "In today's video, I'm breaking down the EXACT strategy that grew our channel from 0 to 100K subscribers in just 12 months. Watch till the end for the FREE resource pack!",
    "This might be the most important video I've ever made. After years of testing, I finally found the formula that works. And I'm sharing EVERYTHING with you today.",
  ],
  WHATSAPP: [
    "Hey! 👋 Just wanted to share something exciting with you. We've just launched our newest feature and I think you're going to love it. Check it out and let me know what you think!",
    "Quick update for our community members 📣 We're running a special offer this week only. Message me directly if you'd like to know more details!",
  ],
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, platforms, tone } = await req.json();
  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

  const openaiKey = process.env.OPENAI_API_KEY;
  const targetPlatforms = platforms || ["FACEBOOK", "TWITTER", "INSTAGRAM", "LINKEDIN"];

  if (openaiKey && openaiKey.length > 10) {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: openaiKey });

      const variations: Record<string, string> = {};
      for (const platform of targetPlatforms) {
        const platformGuide: Record<string, string> = {
          FACEBOOK: "engaging, conversational, 150-250 words with emojis and hashtags",
          TWITTER: "punchy, under 280 chars with 1-2 hashtags",
          INSTAGRAM: "visual, aspirational, 100-150 words with emojis and 5-10 hashtags",
          LINKEDIN: "professional, insightful, 200-300 words, no excessive emojis",
          TIKTOK: "trendy, casual, short hooks, use popular hashtags like #fyp",
          YOUTUBE: "detailed description with SEO keywords, 150-200 words",
          WHATSAPP: "friendly, personal, conversational, under 100 words",
        };
        const response = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `You are a social media expert. Generate ${platformGuide[platform] || "engaging"} content. Tone: ${tone || "professional"}.` },
            { role: "user", content: `Create a ${platform} post about: ${prompt}` },
          ],
          max_tokens: 400,
        });
        variations[platform] = response.choices[0].message.content || "";
      }
      return NextResponse.json({ variations });
    } catch (err) {
      console.error("OpenAI error, falling back to mock:", err);
    }
  }

  // Mock fallback
  const variations: Record<string, string> = {};
  for (const platform of targetPlatforms) {
    const options = MOCK_RESPONSES[platform] || MOCK_RESPONSES.FACEBOOK;
    variations[platform] = options[Math.floor(Math.random() * options.length)];
  }

  return NextResponse.json({ variations, mock: true });
}
