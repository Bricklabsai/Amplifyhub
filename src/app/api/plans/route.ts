import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' },
    });

    return NextResponse.json(plans);
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
