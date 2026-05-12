import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAppBaseUrl,
  getZernioClient,
  toZernioPlatform,
} from "@/lib/zernio";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Query the user to get their Zernio profile ID
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, zernioProfileId: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  if (!user.zernioProfileId) {
    return NextResponse.json(
      { error: "User workspace not configured" },
      { status: 400 }
    );
  }

  const platformParam = req.nextUrl.searchParams.get("platform");
  if (!platformParam) {
    return NextResponse.json(
      { error: "Missing 'platform' query parameter" },
      { status: 400 }
    );
  }

  const platform = toZernioPlatform(platformParam);
  if (!platform) {
    return NextResponse.json(
      { error: `Unsupported platform: ${platformParam}` },
      { status: 400 }
    );
  }

  try {
    const zernio = getZernioClient();
    const redirectUrl = `${getAppBaseUrl()}/api/callback/zernio`;

    const result = await zernio.connect.getConnectUrl({
      path: { platform },
      query: {
        profileId: user.zernioProfileId,
        redirect_url: redirectUrl,
      },
    });

    if (result.error || !result.data?.authUrl) {
      console.error("Zernio.getConnectUrl failed:", result.error);
      return NextResponse.json(
        { error: "Failed to generate connect URL" },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: result.data.authUrl });
  } catch (err) {
    console.error("Zernio connect error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
