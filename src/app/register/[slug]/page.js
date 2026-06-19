import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import RegisterForm from './RegisterForm';
import Link from 'next/link';

export const revalidate = 0;

export default async function RegisterPage(context) {
  // Await params for Next.js 15+ compatibility
  const params = await context.params;
  const { slug } = params;

  const tournament = await db.tournament.findUnique({
    where: { slug },
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

  if (!tournament) {
    notFound();
  }

  const confirmedCount = tournament._count.registrations;
  const isFull = confirmedCount >= tournament.capacity;
  const isOpen = tournament.isOpen && !isFull;
  const cashfreeMode = process.env.CASHFREE_MODE || 'sandbox';

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <Link href="/" className="logo">
            <img src="/logo.jpg" alt="Sri Narayana Guru School of Chess Logo" />
            <span>Sri Narayana Guru School of Chess</span>
          </Link>
          <Link href="/" className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="container" style={{ marginTop: '3rem', marginBottom: '5rem', maxWidth: '800px' }}>
        <div className="glass-card" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{tournament.name}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <div>
              <span style={{ marginRight: '0.375rem' }}>🏷️</span> Entry Fee: <strong style={{ color: 'var(--text-primary)' }}>₹{(tournament.entryFee / 100).toFixed(2)}</strong>
            </div>
            <div>
              <span style={{ marginRight: '0.375rem' }}>👥</span> Slots Filled: <strong style={{ color: 'var(--text-primary)' }}>{confirmedCount} / {tournament.capacity}</strong>
            </div>
          </div>
        </div>

        {!isOpen ? (
          <div className="glass-card" style={{ textAlign: 'center', borderColor: 'var(--error)' }}>
            <h2 style={{ color: 'var(--error)', marginBottom: '0.5rem' }}>Registration Unavailable</h2>
            <p>
              {isFull 
                ? 'We are sorry, but all seats for this tournament have been filled.' 
                : 'This tournament is no longer accepting registrations.'}
            </p>
            <Link href="/" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
              View Other Tournaments
            </Link>
          </div>
        ) : (
          <RegisterForm tournament={tournament} cashfreeMode={cashfreeMode} />
        )}
      </main>
    </>
  );
}
