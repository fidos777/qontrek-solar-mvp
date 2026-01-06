import { useState } from 'react';
import Head from 'next/head';

interface QuoteRequest {
  customerName: string;
  phoneNumber: string;
  address: string;
  monthlyBill: number;
  roofType: 'concrete' | 'metal' | 'tile' | 'other';
}

interface Quote {
  id: string;
  systemSize: number;
  panelCount: number;
  totalPrice: number;
  estimatedSavings: { monthly: number; yearly: number; lifetime: number };
  paybackPeriod: number;
}

interface Classification {
  type: 'A' | 'B' | 'C';
  reason: string;
  confidence: number;
}

type Step = 'form' | 'loading' | 'preview' | 'confirming' | 'success';

export default function Home() {
  const [step, setStep] = useState<Step>('form');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [countdown, setCountdown] = useState(1);
  const [form, setForm] = useState<QuoteRequest>({
    customerName: '',
    phoneNumber: '',
    address: '',
    monthlyBill: 300,
    roofType: 'concrete'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('loading');
    
    const res = await fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate', request: form })
    });
    
    const data = await res.json();
    setQuote(data.quote);
    setClassification(data.classification);
    setStep('preview');
  };

  const handleSend = () => {
    setStep('confirming');
    setCountdown(1);
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 0.1) {
          clearInterval(timer);
          return 0;
        }
        return c - 0.1;
      });
    }, 100);
  };

  const handleConfirm = async () => {
    await fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', quoteId: quote?.id })
    });
    setStep('success');
  };

  const fillDemo = () => {
    setForm({
      customerName: 'Ahmad bin Abdullah',
      phoneNumber: '012-345-6789',
      address: '123 Jalan Maju, Petaling Jaya',
      monthlyBill: 400,
      roofType: 'concrete'
    });
  };

  const reset = () => {
    setStep('form');
    setQuote(null);
    setClassification(null);
  };

  const formatMYR = (n: number) => `RM ${n.toLocaleString()}`;

  return (
    <>
      <Head>
        <title>Qontrek Solar Demo - CIVOS Governance</title>
      </Head>
      
      <div className="container">
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1>☀️ Qontrek Solar Demo</h1>
          <p style={{ color: '#64748b' }}>AI-Governed Quote Generator with CIVOS Classification</p>
          {classification && (
            <span className={`badge badge-${classification.type.toLowerCase()}`} style={{ marginTop: '0.5rem' }}>
              Type {classification.type} - {classification.type === 'A' ? 'AUTO' : classification.type === 'B' ? 'CONFIRM' : 'HOLD'}
            </span>
          )}
        </header>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="card">
            <h2 style={{ marginBottom: '1rem' }}>Quote Request</h2>
            <button type="button" onClick={fillDemo} style={{ marginBottom: '1rem', fontSize: '12px', background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
              📝 Fill Demo Data
            </button>
            
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value})} required />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} required />
            </div>
            
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Monthly Bill (RM)</label>
                <input type="number" className="form-input" value={form.monthlyBill} onChange={e => setForm({...form, monthlyBill: Number(e.target.value)})} min={50} max={5000} required />
              </div>
              <div className="form-group">
                <label className="form-label">Roof Type</label>
                <select className="form-select" value={form.roofType} onChange={e => setForm({...form, roofType: e.target.value as any})}>
                  <option value="concrete">Concrete</option>
                  <option value="metal">Metal</option>
                  <option value="tile">Tile</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              ⚡ Generate Quote
            </button>
            
            <p style={{ marginTop: '1rem', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
              🔒 Type B - Quote generation requires confirmation
            </p>
          </form>
        )}

        {step === 'loading' && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Generating quote with CIVOS classification...</p>
          </div>
        )}

        {step === 'preview' && quote && (
          <div className="card">
            <h2>Quote #{quote.id.slice(-8)}</h2>
            <p style={{ color: '#64748b', marginBottom: '1rem' }}>{form.customerName} • {form.address}</p>
            
            <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{quote.systemSize} kW</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>System Size</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{quote.panelCount}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Panels</div>
              </div>
            </div>
            
            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Investment</span>
                <strong style={{ fontSize: '1.25rem' }}>{formatMYR(quote.totalPrice)}</strong>
              </div>
            </div>
            
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1rem' }}>
              <div style={{ background: '#dcfce7', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', color: '#166534' }}>{formatMYR(quote.estimatedSavings.monthly)}</div>
                <div style={{ fontSize: '11px' }}>Monthly</div>
              </div>
              <div style={{ background: '#dcfce7', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', color: '#166534' }}>{quote.paybackPeriod} yrs</div>
                <div style={{ fontSize: '11px' }}>Payback</div>
              </div>
              <div style={{ background: '#22c55e', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', color: 'white' }}>
                <div style={{ fontWeight: 'bold' }}>{formatMYR(quote.estimatedSavings.lifetime)}</div>
                <div style={{ fontSize: '11px' }}>25-Year ROI</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={reset} className="btn" style={{ flex: 1, background: '#f1f5f9' }}>✏️ Edit</button>
              <button onClick={handleSend} className="btn btn-success" style={{ flex: 2 }}>📤 Send to Customer</button>
            </div>
          </div>
        )}

        {step === 'confirming' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ maxWidth: '400px', width: '90%' }}>
              <span className="badge badge-b">Type B - CONFIRM</span>
              <h2 style={{ margin: '1rem 0' }}>Confirm Send Quote?</h2>
              <p style={{ color: '#64748b', marginBottom: '1rem' }}>Send quote to {form.customerName} via WhatsApp?</p>
              
              {countdown > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '0.5rem' }}>Please review ({countdown.toFixed(1)}s)</div>
                  <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px' }}>
                    <div style={{ height: '100%', background: '#f59e0b', borderRadius: '2px', width: `${(1 - countdown) * 100}%`, transition: 'width 0.1s' }} />
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setStep('preview')} className="btn" style={{ flex: 1, background: '#f1f5f9' }}>Cancel</button>
                <button onClick={handleConfirm} className="btn btn-success" style={{ flex: 1, opacity: countdown > 0 ? 0.5 : 1 }} disabled={countdown > 0}>
                  {countdown > 0 ? '⏳ Wait' : '✅ Confirm'}
                </button>
              </div>
              
              <p style={{ marginTop: '1rem', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                🔒 CIVOS Type B requires 1s confirmation delay
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2>Quote Sent Successfully!</h2>
            <p style={{ color: '#64748b', margin: '1rem 0' }}>Quote #{quote?.id.slice(-8)} sent to {form.customerName}</p>
            
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'left' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>📋 Proof Trail</h4>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                <div>🤖 AI: Quote generated • Type B</div>
                <div>👤 Human: Confirmed after 1s delay</div>
                <div>📤 System: Sent via WhatsApp</div>
              </div>
            </div>
            
            <button onClick={reset} className="btn btn-primary">Generate Another Quote</button>
          </div>
        )}

        <footer style={{ marginTop: '2rem', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
          Powered by Qontrek CIVOS v1.0.0 | Type A (AUTO) • Type B (CONFIRM) • Type C (HOLD)
        </footer>
      </div>
    </>
  );
}
