import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createCashfreeOrder } from '@/lib/cashfree';

// POST /api/register
export async function POST(req) {
  let createdRegistrationId = null;

  try {
    const body = await req.json();
    const { tournamentId, playerName, phone, email, extraFields, selectedCategory } = body;

    // Basic Validation
    if (!tournamentId || !playerName || !phone || !email) {
      return NextResponse.json({ error: 'Missing required standard fields' }, { status: 400 });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Phone validation
    if (phone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Run database operations in transaction to enforce capacity limits
    const txResult = await db.$transaction(async (tx) => {
      // Find tournament
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId }
      });

      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (!tournament.isOpen) {
        throw new Error('Tournament is currently closed for registrations');
      }

      // Determine entry fee based on category
      let finalEntryFee = tournament.entryFee;
      if (tournament.categoryFees) {
        try {
          const feesMap = JSON.parse(tournament.categoryFees);
          if (!selectedCategory) {
            throw new Error('Payment category is required');
          }
          if (feesMap[selectedCategory] === undefined) {
            throw new Error(`Invalid payment category: "${selectedCategory}"`);
          }
          finalEntryFee = feesMap[selectedCategory];
        } catch (e) {
          console.error('Failed parsing categoryFees:', e);
          if (e.message && e.message.includes('category')) {
            throw e;
          }
        }
      }

      // Validate dynamic form fields
      const schema = JSON.parse(tournament.formSchema);
      const parsedExtra = extraFields || {};

      // Embed the category into extraFields so it shows in CSV exports
      if (selectedCategory) {
        parsedExtra.paymentCategory = selectedCategory;
      }

      for (const field of schema) {
        if (field.required && !parsedExtra[field.key]) {
          throw new Error(`Field "${field.label}" is required`);
        }
      }

      // Generate order ID
      const orderId = `CHESS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Create PENDING registration
      const reg = await tx.registration.create({
        data: {
          tournamentId: tournament.id,
          status: 'PENDING',
          playerName,
          phone,
          email,
          extraFields: JSON.stringify(parsedExtra),
          orderId,
          amountPaid: finalEntryFee, // in paise (dynamically calculated)
        }
      });

      return { reg, tournament };
    });

    const { reg, tournament } = txResult;
    createdRegistrationId = reg.id;

    // Contact Cashfree to create the order
    // Order amount is in rupees (float)
    const orderAmount = (reg.amountPaid / 100).toFixed(2);
    // Sanitize customerId to be alphanumeric with underscore
    const customerId = email.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Math.floor(Math.random() * 10000);

    const cashfreeOrder = await createCashfreeOrder({
      orderId: reg.orderId,
      orderAmount,
      customerDetails: {
        customerId,
        customerName: reg.playerName,
        customerEmail: reg.email,
        customerPhone: reg.phone,
      }
    });

    return NextResponse.json({
      paymentSessionId: cashfreeOrder.payment_session_id,
      orderId: reg.orderId,
    });

  } catch (error) {
    console.error('Error during registration checkout creation:', error.message);

    // Rollback PENDING row if Cashfree API fails
    if (createdRegistrationId) {
      try {
        await db.registration.delete({
          where: { id: createdRegistrationId }
        });
      } catch (dbErr) {
        console.error('Failed to cleanup orphaned pending registration:', dbErr);
      }
    }

    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
