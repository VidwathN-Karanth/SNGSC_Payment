import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/registrations/[orderId]/status
export async function GET(req, context) {
  try {
    // Await params for Next.js 15+ compatibility
    const params = await context.params;
    const { orderId } = params;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const registration = await db.registration.findUnique({
      where: { orderId },
      select: {
        id: true,
        status: true,
        playerName: true,
        amountPaid: true,
        createdAt: true,
        confirmedAt: true
      }
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    return NextResponse.json(registration);
  } catch (error) {
    console.error('Error fetching registration status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
