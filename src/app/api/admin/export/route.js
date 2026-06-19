import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

function escapeCsv(val) {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET /api/admin/export
export async function GET(req) {
  try {
    // Authenticate admin session
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get('tournamentId');

    if (!tournamentId) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
    }

    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Retrieve only CONFIRMED registrations
    const registrations = await db.registration.findMany({
      where: {
        tournamentId,
        status: 'CONFIRMED'
      },
      orderBy: { confirmedAt: 'asc' }
    });

    // Parse tournament dynamic form configuration
    let formFields = [];
    try {
      formFields = JSON.parse(tournament.formSchema || '[]');
    } catch (e) {
      console.error('Failed to parse tournament form schema:', e);
    }

    // Compile CSV Headers
    const standardHeaders = [
      'Registration ID',
      'Player Name',
      'Email',
      'Phone',
      'Order ID',
      'Payment ID',
      'Amount Paid (INR)',
      'Creation Date',
      'Confirmation Date'
    ];
    const dynamicHeaders = formFields.map(field => field.label || field.key);
    const fullHeaders = [...standardHeaders, ...dynamicHeaders];

    const csvLines = [];
    csvLines.push(fullHeaders.map(escapeCsv).join(','));

    // Populate CSV Rows
    for (const reg of registrations) {
      const standardData = [
        reg.id,
        reg.playerName,
        reg.email,
        reg.phone,
        reg.orderId,
        reg.paymentId || 'N/A',
        (reg.amountPaid / 100).toFixed(2),
        reg.createdAt.toISOString(),
        reg.confirmedAt ? reg.confirmedAt.toISOString() : 'N/A'
      ];

      let extraFieldsParsed = {};
      try {
        extraFieldsParsed = JSON.parse(reg.extraFields || '{}');
      } catch (e) {}

      const dynamicData = formFields.map(field => extraFieldsParsed[field.key] || '');
      const fullRow = [...standardData, ...dynamicData];
      csvLines.push(fullRow.map(escapeCsv).join(','));
    }

    const csvContent = csvLines.join('\n');

    // Send formatted CSV download response
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="registrations_${tournament.slug}.csv"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });

  } catch (error) {
    console.error('[EXPORT] Error executing CSV export:', error);
    return NextResponse.json({ error: 'Failed to export registrations CSV' }, { status: 500 });
  }
}
