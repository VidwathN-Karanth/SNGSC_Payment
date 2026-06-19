'use client';

import { useState } from 'react';
import Script from 'next/script';

export default function RegisterForm({ tournament, cashfreeMode }) {
  const formSchema = JSON.parse(tournament.formSchema || '[]');

  // Parse category fees
  const categoryFees = tournament.categoryFees ? JSON.parse(tournament.categoryFees) : null;
  const categoryKeys = categoryFees ? Object.keys(categoryFees) : [];

  // Form Fields State
  const [playerName, setPlayerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categoryKeys.length > 0 ? categoryKeys[0] : '');
  const [extraFields, setExtraFields] = useState({});

  // UI Flow State
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'processing' | 'checkout' | 'polling' | 'success' | 'failed'
  const [errorMessage, setErrorMessage] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');

  // Handle dynamic input changes
  const handleExtraChange = (key, value) => {
    setExtraFields((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  // Submit form and launch payment modal
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status !== 'idle') return;

    if (!sdkLoaded || !window.Cashfree) {
      setErrorMessage('Payment SDK is still loading. Please wait a moment.');
      return;
    }

    setStatus('processing');
    setErrorMessage('');

    try {
      // Create order on our backend
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: tournament.id,
          playerName,
          email,
          phone,
          extraFields,
          selectedCategory
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate registration.');
      }

      const { paymentSessionId, orderId } = data;
      setCurrentOrderId(orderId);

      // Initialize Cashfree client SDK
      const cashfree = window.Cashfree({
        mode: cashfreeMode // 'sandbox' or 'production'
      });

      setStatus('checkout');

      // Trigger Cashfree Modal overlay
      cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_modal'
      }).then((result) => {
        // Start polling the server regardless of checkout return
        // to verify if webhook captured the payment successfully
        startPollingStatus(orderId);
      });

    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMessage(err.message);
      setStatus('idle');
    }
  };

  // Poll status endpoint
  const startPollingStatus = async (orderId) => {
    setStatus('polling');
    let attempts = 0;
    const maxAttempts = 15; // 30 seconds total (2s intervals)

    const pollInterval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/registrations/${orderId}/status`);
        if (!res.ok) throw new Error('Status fetch failed');
        
        const reg = await res.json();
        
        if (reg.status === 'CONFIRMED') {
          clearInterval(pollInterval);
          setStatus('success');
        } else if (reg.status === 'FAILED') {
          clearInterval(pollInterval);
          setStatus('failed');
          setErrorMessage('Payment failed or was canceled.');
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          // If we hit the limit and it is still pending:
          setStatus('failed');
          setErrorMessage('Verification is taking longer than usual. Please check your email or contact support.');
        }
      } catch (err) {
        console.error('Polling error:', err);
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setStatus('failed');
          setErrorMessage('Failed to verify status. Please contact support.');
        }
      }
    }, 2000);
  };

  // Success screen
  if (status === 'success') {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '2px solid var(--success)',
          color: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          margin: '0 auto 1.5rem auto',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
        }}>
          ✓
        </div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Registration Confirmed!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Thank you, <strong>{playerName}</strong>. Your payment was processed successfully. A confirmation has been generated in our system.
        </p>
        <div className="glass-card" style={{ padding: '1.25rem', display: 'inline-flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', textAlign: 'left', minWidth: '300px' }}>
          <div>🎫 <strong>Order ID:</strong> {currentOrderId}</div>
          <div>🏆 <strong>Tournament:</strong> {tournament.name}</div>
          <div>💰 <strong>Amount Paid:</strong> ₹{categoryFees && selectedCategory ? (categoryFees[selectedCategory] / 100).toFixed(2) : (tournament.entryFee / 100).toFixed(2)}</div>
        </div>
        <div style={{ marginTop: '2.5rem' }}>
          <a href="/" className="btn btn-primary">Go to Homepage</a>
        </div>
      </div>
    );
  }

  // Loading/Polling Screen
  if (status === 'polling') {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1.5rem auto', width: '3.5rem', height: '3.5rem', border: '3px solid rgba(255, 255, 255, 0.05)', borderTopColor: 'var(--primary)' }}></div>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Verifying Payment Status...</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Please do not refresh the page or close your browser. We are checking the payment gateway server confirmation.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <Script 
        src="https://sdk.cashfree.com/js/v3/cashfree.js" 
        strategy="lazyOnload" 
        onLoad={() => setSdkLoaded(true)} 
      />

      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        Participant Registration
      </h2>

      {errorMessage && (
        <div style={{
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.2)',
          color: 'var(--error)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.95rem'
        }}>
          ⚠️ {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Payment Category Selector */}
        {categoryFees && (
          <div className="form-group">
            <label className="form-label" htmlFor="selectedCategory">Payment Category</label>
            <select
              id="selectedCategory"
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={status !== 'idle'}
              required
            >
              {categoryKeys.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} — ₹{(categoryFees[cat] / 100).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Player Name */}
        <div className="form-group">
          <label className="form-label" htmlFor="playerName">Full Name</label>
          <input 
            type="text" 
            id="playerName" 
            className="form-input" 
            placeholder="Enter player's full name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            required
            disabled={status !== 'idle'}
          />
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email Address</label>
          <input 
            type="email" 
            id="email" 
            className="form-input" 
            placeholder="player@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status !== 'idle'}
          />
        </div>

        {/* Phone */}
        <div className="form-group">
          <label className="form-label" htmlFor="phone">Phone Number (UPI linked preferred)</label>
          <input 
            type="tel" 
            id="phone" 
            className="form-input" 
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            disabled={status !== 'idle'}
          />
        </div>

        {/* Dynamic Fields */}
        {formSchema.map((field) => (
          <div className="form-group" key={field.key}>
            <label className="form-label" htmlFor={field.key}>
              {field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
            </label>
            
            {field.type === 'select' ? (
              <select
                id={field.key}
                className="form-select"
                value={extraFields[field.key] || ''}
                onChange={(e) => handleExtraChange(field.key, e.target.value)}
                required={field.required}
                disabled={status !== 'idle'}
              >
                <option value="">Select option</option>
                {field.options && field.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id={field.key}
                className="form-input"
                placeholder={`Enter ${field.label.toLowerCase()}`}
                value={extraFields[field.key] || ''}
                onChange={(e) => handleExtraChange(field.key, e.target.value)}
                required={field.required}
                disabled={status !== 'idle'}
              />
            )}
          </div>
        ))}

        <div style={{ marginTop: '2rem' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={status !== 'idle' || !sdkLoaded}
          >
            {status === 'processing' ? (
              <span className="flex-gap-2">
                <span className="spinner"></span> Initiating checkout...
              </span>
            ) : status === 'checkout' ? (
              'Opening Checkout Window...'
            ) : (
              `Proceed to Payment — ₹${categoryFees && selectedCategory ? (categoryFees[selectedCategory] / 100).toFixed(2) : (tournament.entryFee / 100).toFixed(2)}`
            )}
          </button>
          {!sdkLoaded && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
              Loading Payment Gateway SDK...
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
