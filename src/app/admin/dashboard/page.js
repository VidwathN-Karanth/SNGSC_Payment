'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tournament Builder Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [entryFee, setEntryFee] = useState('500'); // Rupees default
  const [capacity, setCapacity] = useState('100');
  const [formSchema, setFormSchema] = useState(JSON.stringify([
    { key: 'fideId', label: 'FIDE ID (optional)', type: 'text', required: false },
    { key: 'club', label: 'Chess Club Name', type: 'text', required: true },
    { key: 'ageCategory', label: 'Age Group', type: 'select', options: ['Under 11', 'Under 15', 'Open'], required: true }
  ], null, 2));
  
  const [creating, setCreating] = useState(false);

  // Fetch Tournaments & Stats
  const fetchTournaments = async () => {
    try {
      const res = await fetch('/api/tournaments');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to fetch tournaments');
      }
      const data = await res.json();
      setTournaments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  // Sync slug helper
  const handleNameChange = (val) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  // Create Tournament Handler
  const handleCreateTournament = async (e) => {
    e.preventDefault();
    if (creating) return;

    setError('');
    
    // Validation
    try {
      JSON.parse(formSchema);
    } catch (e) {
      setError('Form Schema must be valid JSON');
      return;
    }

    setCreating(true);

    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          entryFee: Math.round(parseFloat(entryFee) * 100), // convert to paise
          capacity: parseInt(capacity, 10),
          formSchema,
          isOpen: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create tournament');
      }

      // Reset form & Refresh list
      setName('');
      setSlug('');
      setEntryFee('500');
      setCapacity('100');
      await fetchTournaments();

    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  // Calculate Metrics
  const totalTournaments = tournaments.length;
  const totalRegistrations = tournaments.reduce((acc, t) => acc + (t._count?.registrations || 0), 0);
  const totalRevenue = tournaments.reduce((acc, t) => acc + ((t._count?.registrations || 0) * t.entryFee), 0) / 100;
  const totalCapacity = tournaments.reduce((acc, t) => acc + t.capacity, 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ width: '3rem', height: '3rem', borderWidth: '3px', borderTopColor: 'var(--primary)' }}></div>
      </div>
    );
  }

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <Link href="/" className="logo">
            ♟️ Chess<span>Register</span> <small style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '0.5rem', border: '1px solid var(--border-color)', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>ORGANIZER</small>
          </Link>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
            Logout 🚪
          </button>
        </div>
      </header>

      <main className="container" style={{ marginTop: '3rem', marginBottom: '5rem' }}>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '2rem' }}>Dashboard Overview</h1>

        {error && (
          <div style={{
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            color: 'var(--error)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '2rem',
            fontSize: '0.95rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Analytics Grid */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🏆</span>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-display)' }}>{totalTournaments}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>Active Tournaments</div>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>👥</span>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-display)' }}>{totalRegistrations}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>Confirmed Players</div>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>💰</span>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>₹{totalRevenue.toLocaleString()}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>Entry Fees Collected</div>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📈</span>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-display)' }}>
              {totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0}%
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>Capacity Occupancy</div>
          </div>
        </section>

        <div className="grid-2">
          {/* Tournament Creation Form */}
          <section className="glass-card" style={{ height: 'fit-content' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              Create New Tournament
            </h2>
            <form onSubmit={handleCreateTournament}>
              <div className="form-group">
                <label className="form-label" htmlFor="t-name">Tournament Name</label>
                <input 
                  type="text" 
                  id="t-name" 
                  className="form-input" 
                  placeholder="e.g. Chess Masters Cup 2026"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="t-slug">URL Slug</label>
                <input 
                  type="text" 
                  id="t-slug" 
                  className="form-input" 
                  placeholder="e.g. chess-masters-cup-2026"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="t-fee">Entry Fee (INR)</label>
                <input 
                  type="number" 
                  id="t-fee" 
                  className="form-input" 
                  placeholder="500"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  required
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="t-cap">Capacity Limit (Players)</label>
                <input 
                  type="number" 
                  id="t-cap" 
                  className="form-input" 
                  placeholder="100"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                  min="1"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="t-schema">Dynamic Form Schema (JSON Array)</label>
                <textarea 
                  id="t-schema" 
                  className="form-input" 
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem', height: '180px', resize: 'vertical' }}
                  value={formSchema}
                  onChange={(e) => setFormSchema(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={creating}
              >
                {creating ? (
                  <span className="flex-gap-2">
                    <span className="spinner"></span> Creating...
                  </span>
                ) : (
                  'Create Event 🏆'
                )}
              </button>
            </form>
          </section>

          {/* Tournaments List Table */}
          <section className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              Manage Tournaments
            </h2>
            
            {tournaments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                No tournaments configured yet. Use the creation panel to define your first event.
              </div>
            ) : (
              <div className="table-container" style={{ flexGrow: 1 }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Event Details</th>
                      <th>Registrations</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournaments.map((t) => {
                      const count = t._count?.registrations || 0;
                      return (
                        <tr key={t.id}>
                          <td>
                            <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{t.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/{t.slug}</span>
                            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--accent)', marginTop: '0.25rem' }}>
                              ₹{(t.entryFee / 100).toFixed(2)}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600' }}>
                            {count} / {t.capacity}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <a 
                                href={`/api/admin/export?tournamentId=${t.id}`} 
                                className="btn btn-secondary" 
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem', justifyContent: 'center' }}
                              >
                                📥 CSV
                              </a>
                              <Link 
                                href={`/register/${t.slug}`} 
                                className="btn btn-secondary"
                                target="_blank"
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', textAlign: 'center' }}
                              >
                                🔗 Link
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>© {new Date().getFullYear()} ChessRegister. Tournament Organizer Panel.</p>
        </div>
      </footer>
    </>
  );
}
