import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyCashfreeSignature } from '@/lib/cashfree';

// POST /api/payments/webhook
export async function POST(req) {
  try {
    const timestamp = req.headers.get('x-webhook-timestamp');
    const signature = req.headers.get('x-webhook-signature');

    // Capture raw body string for cryptographic validation
    const rawBody = await req.text();

    // Verify signature using Cashfree Client Secret
    const isValid = verifyCashfreeSignature(rawBody, timestamp, signature);
    if (!isValid) {
      console.warn('[WEBHOOK] Invalid webhook signature detected. Rejecting request.');
      return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
    }

    // Parse verified payload
    const payload = JSON.parse(rawBody);
    const { type, data } = payload;

    if (!data || !data.order || !data.order.order_id) {
      return NextResponse.json({ error: 'Malformed webhook payload' }, { status: 400 });
    }

    const orderId = data.order.order_id;
    console.log(`[WEBHOOK] Processing event: ${type} for Order ID: ${orderId}`);

    // Lookup registration record
    const registration = await db.registration.findUnique({
      where: { orderId }
    });

    if (!registration) {
      console.error(`[WEBHOOK] Order ID: ${orderId} not found in database.`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Handle Payment Success
    if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
      // Idempotency: skip if already confirmed
      if (registration.status === 'CONFIRMED') {
        console.log(`[WEBHOOK] Order ID: ${orderId} is already CONFIRMED. Acknowledging duplicate webhook.`);
        return NextResponse.json({ status: 'ok', detail: 'already_processed' }, { status: 200 });
      }

      const cfPaymentId = data.payment?.cf_payment_id 
        ? String(data.payment.cf_payment_id) 
        : 'unknown_payment_id';

      // Update to CONFIRMED
      await db.registration.update({
        where: { orderId },
        data: {
          status: 'CONFIRMED',
          paymentId: cfPaymentId,
          confirmedAt: new Date()
        }
      });

      console.log(`[WEBHOOK] Successfully confirmed registration for ${registration.playerName} (Order: ${orderId})`);
    } 
    // Handle Payment Failure
    else if (type === 'PAYMENT_FAILED_WEBHOOK') {
      if (registration.status === 'PENDING') {
        await db.registration.update({
          where: { orderId },
          data: { status: 'FAILED' }
        });
        console.log(`[WEBHOOK] Registration for ${registration.playerName} (Order: ${orderId}) marked as FAILED.`);
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });

  } catch (error) {
    console.error('[WEBHOOK] Error handling Cashfree webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
