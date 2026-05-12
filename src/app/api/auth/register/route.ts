import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getZernioClient } from "@/lib/zernio";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    // Create Zernio profile for the user
    try {
      const zernio = getZernioClient();
      console.log(`[Registration] Creating Zernio profile for user ${user.id} (${user.email})`);
      
      const profileResult = await zernio.profiles.createProfile({
        body: { name: user.name || user.email },
      });

      console.log(`[Registration] Zernio createProfile response:`, JSON.stringify(profileResult, null, 2));

      if (profileResult.error) {
        console.error(
          `[Registration] Failed to create Zernio profile for ${user.email}:`,
          profileResult.error
        );
        // Log the error but continue - profile can be created later
      } else if (profileResult.data?.profile?._id) {
        // Update user with the Zernio profile ID
        const zernioProfileId = profileResult.data.profile._id;
        console.log(`[Registration] Successfully created Zernio profile: ${zernioProfileId}`);
        await prisma.user.update({
          where: { id: user.id },
          data: { zernioProfileId },
        });
      } else {
        console.warn(
          `[Registration] Unexpected Zernio response format - no profile._id in data:`,
          JSON.stringify(profileResult, null, 2)
        );
      }
    } catch (zernioError) {
      console.error(`[Registration] Error creating Zernio profile for ${user.email}:`, {
        error: zernioError instanceof Error ? zernioError.message : String(zernioError),
        stack: zernioError instanceof Error ? zernioError.stack : undefined,
      });
      // Continue without blocking user creation
    }

    // Assign basic plan
    const basicPlan = await prisma.plan.findFirst({
      where: { name: "Basic" },
      select: { id: true },
    });
    if (basicPlan) {
      await prisma.subscription.create({
        data: { userId: user.id, planId: basicPlan.id, status: "ACTIVE" },
      });
    }

    // Welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Welcome to AmplifyHub!",
        message: "Get started by connecting your social accounts.",
        type: "info",
      },
    });

    return NextResponse.json({ message: "Account created successfully" }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
