import { NextRequest, NextResponse } from "next/server";
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
      const profileResult = await zernio.profiles.createProfile({
        body: { name: user.name || user.email },
      });

      if (profileResult.error || !profileResult.data?.id) {
        console.error(
          "Failed to create Zernio profile:",
          profileResult.error
        );
        // Log the error but continue - profile can be created later
      } else {
        // Update user with the Zernio profile ID
        await prisma.user.update({
          where: { id: user.id },
          data: { zernioProfileId: profileResult.data.id },
        });
      }
    } catch (zernioError) {
      console.error("Error creating Zernio profile:", zernioError);
      // Continue without blocking user creation
    }

    // Assign basic plan
    const basicPlan = await prisma.plan.findFirst({ where: { name: "Basic" } });
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
