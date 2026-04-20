import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const plans = await prisma.plan.findMany({ orderBy: { price: "asc" } });
  return NextResponse.json(plans);
}
