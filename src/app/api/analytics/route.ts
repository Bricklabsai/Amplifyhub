import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildUserAnalytics } from "@/lib/services/analyticsService";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(7, Number.parseInt(searchParams.get("days") || "30", 10)));

  const payload = await buildUserAnalytics(userId, days);

  return NextResponse.json({
    ...payload,
    analytics: payload.daily,
  });
}
