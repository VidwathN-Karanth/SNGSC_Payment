import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

// GET /api/tournaments
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyOpen = searchParams.get('open') === 'true';

    const tournaments = await db.tournament.findMany({
      where: onlyOpen ? { isOpen: true } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            registrations: {
              where: { status: 'CONFIRMED' }
            }
          }
        }
      }
    });

    return NextResponse.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
  }
}

// POST /api/tournaments
export async function POST(req) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, slug, entryFee, categoryFees, capacity, isOpen, formSchema } = await req.json();

    if (!name || !slug || !entryFee || !capacity || !formSchema) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await db.tournament.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Slug must be unique' }, { status: 400 });
    }

    const tournament = await db.tournament.create({
      data: {
        name,
        slug,
        entryFee: parseInt(entryFee, 10), // stored in paise
        categoryFees: categoryFees ? (typeof categoryFees === 'string' ? categoryFees : JSON.stringify(categoryFees)) : null,
        capacity: parseInt(capacity, 10),
        isOpen: isOpen !== undefined ? isOpen : true,
        formSchema: typeof formSchema === 'string' ? formSchema : JSON.stringify(formSchema),
      },
    });

    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 });
  }
}
