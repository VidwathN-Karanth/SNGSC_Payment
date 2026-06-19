import Link from 'next/link';
import { db } from '@/lib/db';

export const revalidate = 0; // Disable cache so tournament spots are always live

export default async function HomePage() {
  const tournaments = await db.tournament.findMany({
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

  return (
    <>
      {/* Navigation Header */}
      <header className="header">
        <div className="container header-inner">
          <Link href="/" className="logo">
            <img src="/logo.jpg" alt="Sri Narayana Guru School of Chess Logo" />
            <span>Sri Narayana Guru School of Chess</span>
          </Link>
          <nav>
            <Link href="/admin/dashboard" className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
              Admin Panel
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container" style={{ marginTop: '3.5rem', marginBottom: '5rem' }}>
        <section style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
            Official Tournament Registrations
          </h1>
          <p style={{ fontSize: '1.15rem', maxWidth: '720px', margin: '0 auto', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
            Welcome to the official registration desk of Sri Narayana Guru School of Chess. Secure your spot in our upcoming tournaments. Instantly complete payments via Cashfree and receive verified receipts.
          </p>
        </section>

        {/* Tournament Grid */}
        <section>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            <span>♟️</span> Open Tournaments
          </h2>

          {tournaments.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🏆</span>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Tournaments Available</h3>
              <p>Check back later or contact the tournament organizer to set up events.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '2rem' }}>
              {tournaments.map((tournament) => {
                const confirmedCount = tournament._count.registrations;
                const isFull = confirmedCount >= tournament.capacity;
                const isOpen = tournament.isOpen && !isFull;
                const fillPercentage = Math.min(100, Math.round((confirmedCount / tournament.capacity) * 100));

                return (
                  <div key={tournament.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem' }}>
                    <div className="flex-between" style={{ marginBottom: '1rem' }}>
                      <span className={`badge ${isOpen ? 'badge-confirmed' : 'badge-failed'}`}>
                        {isOpen ? 'Registration Open' : isFull ? 'Sold Out' : 'Closed'}
                      </span>
                      <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>
                        ₹{(tournament.entryFee / 100).toFixed(0)}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.35rem', marginBottom: '0.75rem', minHeight: '3.4rem', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {tournament.name}
                    </h3>

                    {/* Progress Bar */}
                    <div style={{ margin: '1.5rem 0' }}>
                      <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Capacity Filled</span>
                        <span style={{ color: 'var(--text-primary)' }}>{confirmedCount} / {tournament.capacity} Players</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${fillPercentage}%`, 
                          height: '100%', 
                          background: isFull 
                            ? 'linear-gradient(90deg, #ef4444, #dc2626)' 
                            : 'linear-gradient(90deg, #2563eb, #3b82f6)', 
                          borderRadius: '9999px',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                      {isOpen ? (
                        <Link href={`/register/${tournament.slug}`} className="btn btn-primary" style={{ width: '100%' }}>
                          Register & Pay Online
                        </Link>
                      ) : (
                        <button className="btn btn-secondary" style={{ width: '100%' }} disabled>
                          {isFull ? 'Sold Out' : 'Registration Closed'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>© {new Date().getFullYear()} Sri Narayana Guru School of Chess. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
