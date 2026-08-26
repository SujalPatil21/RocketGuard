import { useEffect, useState, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import type { PaymentResult, Stats } from '../lib/api';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function eventColor(type: string): string {
  if (type.includes('APPROVED'))      return '#7DBF9A';
  if (type.includes('REJECTED'))      return '#F04B4B';
  if (type.includes('HELD'))          return '#F28A45';
  if (type.includes('UNPROCESSABLE')) return '#E9C84A';
  if (type.includes('PIPELINE_ERROR')) return '#F04B4B';
  if (type.includes('CLEAR'))         return '#7DBF9A';
  return '#92999F';
}

// ──────────────────────────────────────────────
// Activity Page
// ──────────────────────────────────────────────

export default function Activity() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<PaymentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api.getStats(), api.getPayments()]);
      setStats(s);
      setPayments(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReset = async () => {
    if (resetting) return;
    setResetting(true);
    setResetError(null);
    try {
      await api.resetDemo();
      setLoading(true);
      await load();
    } catch (err: unknown) {
      setResetError((err as Error).message || 'Reset failed.');
    } finally {
      setResetting(false);
    }
  };

  // Flatten and sort all audit events across all payments
  const allEvents = payments
    .flatMap(p =>
      p.audit_events.map(e => ({
        ...e,
        invoice_id: p.payment.invoice_id,
        vendor_name: p.payment.vendor_name,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ── Header ────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '36px',
              fontWeight: 400,
              color: '#17191B',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            Activity
          </h1>
          <p style={{ fontSize: '14px', color: '#596168' }}>
            Audit trail and pipeline execution history.
          </p>
        </div>
        <button
          id="reset-demo-btn"
          className="btn-secondary"
          onClick={handleReset}
          disabled={resetting}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RotateCcw size={13} />
          {resetting ? 'Resetting…' : 'Reset Demo'}
        </button>
      </div>

      {resetError && (
        <div style={{ background: '#FFF5F5', border: '1px solid rgba(240,75,75,0.25)', borderRadius: '14px', padding: '12px 16px', fontSize: '13px', color: '#F04B4B' }}>
          {resetError}
        </div>
      )}

      {/* ── Stats row ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kpi-card skeleton" style={{ height: '100px' }} />
          ))
        ) : stats ? (
          [
            { label: 'Screened',   value: stats.screened,   color: '#17191B' },
            { label: 'Clear',      value: stats.clear,      color: '#7DBF9A' },
            { label: 'Held',       value: stats.held,       color: '#F04B4B' },
            { label: 'Resolved',   value: stats.approved + stats.rejected, color: '#17191B' },
          ].map(item => (
            <div key={item.label} className="kpi-card">
              <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#596168', marginBottom: '10px' }}>
                {item.label}
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', fontWeight: 500, color: item.color }}>
                {item.value}
              </div>
            </div>
          ))
        ) : null}
      </div>

      {/* ── Two-column layout ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', alignItems: 'start' }}>

        {/* Left — audit event feed */}
        <div
          style={{
            background: '#D2E2F9',
            borderRadius: '24px',
            padding: '28px',
            boxShadow: '0 8px 30px rgba(35,50,65,0.07)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#17191B', marginBottom: '20px' }}>
            System Events
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px' }}>
                  <div className="skeleton" style={{ width: 42, height: 12, borderRadius: 4 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ width: '40%', height: 12, borderRadius: 4, marginBottom: 6 }} />
                    <div className="skeleton" style={{ width: '70%', height: 10, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : allEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9DB1BF', fontSize: '13px' }}>
              No activity yet. Run a screening batch to see events here.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0',
                maxHeight: '600px',
                overflowY: 'auto',
              }}
            >
              {allEvents.map((evt, i) => {
                const color = eventColor(evt.type);
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '14px',
                      padding: '12px 0',
                      borderBottom: i < allEvents.length - 1 ? '1px solid rgba(35,50,65,0.06)' : 'none',
                    }}
                  >
                    {/* Timestamp */}
                    <div style={{ width: 54, flexShrink: 0 }}>
                      <div style={{ fontSize: '10px', color: '#9DB1BF', fontFamily: 'monospace' }}>
                        {fmtTime(evt.timestamp)}
                      </div>
                    </div>

                    {/* Dot */}
                    <div style={{ paddingTop: '4px', flexShrink: 0 }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color }} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#17191B' }}>
                          {evt.type.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#9DB1BF' }}>
                          {evt.invoice_id}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#596168' }}>{evt.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — compute resources */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              background: '#D2E2F9',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 8px 30px rgba(35,50,65,0.07)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#17191B', marginBottom: '18px' }}>
              Compute
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 16, borderRadius: 4 }} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Runtime',  value: stats ? `${stats.runtime_ms}ms` : '—' },
                  { label: 'Tokens',   value: stats ? stats.tokens.toLocaleString() : '—' },
                  { label: 'Model',    value: 'llama3.2 (Local)' },
                  { label: 'Backend',  value: 'FastAPI' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(35,50,65,0.06)', paddingBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#596168' }}>{row.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#17191B', fontFamily: 'monospace' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Per-payment summary */}
          {!loading && payments.length > 0 && (
            <div
              style={{
                background: '#D2E2F9',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 8px 30px rgba(35,50,65,0.07)',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#17191B', marginBottom: '18px' }}>
                Payment Log
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {payments.map(p => {
                  const sc =
                    p.status === 'CLEAR' || p.status === 'APPROVED' ? '#7DBF9A' :
                    p.status === 'HELD' || p.status === 'REJECTED' ? '#F04B4B' :
                    p.status === 'UNPROCESSABLE' ? '#E9C84A' : '#92999F';
                  return (
                    <div
                      key={p.payment.invoice_id}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(35,50,65,0.06)' }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#596168' }}>{p.payment.invoice_id}</div>
                        <div style={{ fontSize: '10px', color: '#9DB1BF' }}>{fmtDate(p.payment.submitted_at)}</div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: sc, background: `${sc}15`, borderRadius: '9999px', padding: '2px 6px' }}>
                        {p.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
