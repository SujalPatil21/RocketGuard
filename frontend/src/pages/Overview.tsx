import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import type { PaymentResult, Stats } from '../lib/api';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function normalizeRisk(score: number): number {
  return (score <= 1 && score > 0) ? Math.round(score * 100) : Math.round(score);
}

function fmtAmount(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}

function fmtRisk(rawScore: number): { label: string; color: string } {
  const score = normalizeRisk(rawScore);
  if (score >= 80) return { label: 'Critical', color: '#F04B4B' };
  if (score >= 60) return { label: 'High', color: '#F28A45' };
  if (score >= 40) return { label: 'Medium', color: '#E9C84A' };
  if (score > 0) return { label: 'Low', color: '#7DBF9A' };
  return { label: 'Pending', color: '#92999F' };
}

function statusColor(status: string): string {
  switch (status) {
    case 'CLEAR': return '#7DBF9A';
    case 'HELD': return '#F04B4B';
    case 'APPROVED': return '#7DBF9A';
    case 'REJECTED': return '#F04B4B';
    case 'UNPROCESSABLE': return '#E9C84A';
    default: return '#92999F';
  }
}

// ──────────────────────────────────────────────
// Skeleton
// ──────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="kpi-card animate-pulse">
      <div className="skeleton h-3 w-20 mb-4 rounded" style={{ background: 'rgba(35,50,65,0.08)' }} />
      <div className="skeleton h-10 w-28 mb-2 rounded" style={{ background: 'rgba(35,50,65,0.08)' }} />
      <div className="skeleton h-3 w-16 rounded" style={{ background: 'rgba(35,50,65,0.08)' }} />
    </div>
  );
}

// ──────────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div
        style={{
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#596168',
          marginBottom: '12px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '36px',
          fontWeight: 500,
          lineHeight: 1.1,
          color: accent ?? '#17191B',
          marginBottom: '8px',
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: '12px',
            color: '#596168',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Pipeline Health card (right column)
// ──────────────────────────────────────────────

interface PipelineHealthProps {
  screened: number;
}

function PipelineHealth({ screened }: PipelineHealthProps) {
  const stages = [
    { name: 'Ingestion', key: 'ingestion' },
    { name: 'Screening', key: 'screening' },
    { name: 'Detection', key: 'detection' },
    { name: 'Alerting', key: 'alerting' },
  ];

  const isActive = screened > 0;

  return (
    <div className="analytics-card" style={{ height: '100%' }}>
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#17191B',
          marginBottom: '24px',
        }}
      >
        Pipeline Health
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {stages.map(stage => (
          <div
            key={stage.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                className="status-dot"
                style={{
                  background: isActive ? '#7DBF9A' : '#92999F',
                  animation: isActive ? undefined : undefined,
                }}
              />
              <span style={{ fontSize: '13px', color: '#596168' }}>{stage.name}</span>
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: isActive ? '#7DBF9A' : '#92999F',
              }}
            >
              {isActive ? 'Healthy' : 'Idle'}
            </span>
          </div>
        ))}
      </div>

      {screened > 0 && (
        <div
          style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(35,50,65,0.08)',
            fontSize: '12px',
            color: '#596168',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>Payments screened</span>
            <span style={{ fontWeight: 500, color: '#17191B' }}>{screened}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Attention card
// ──────────────────────────────────────────────

interface AttentionCardProps {
  payment: PaymentResult;
  onReview: (id: string) => void;
}

function AttentionCard({ payment, onReview }: AttentionCardProps) {
  const { label: riskLabel, color: riskColor } = fmtRisk(payment.risk_score);

  return (
    <div
      style={{
        background: '#F9FBFD',
        borderRadius: '18px',
        padding: '16px',
        boxShadow: '0 4px 16px rgba(35,50,65,0.06)',
        border: `1px solid rgba(240,75,75,0.15)`,
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(35,50,65,0.10)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(35,50,65,0.06)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#17191B', marginBottom: '2px' }}>
            {payment.payment.vendor_name}
          </div>
          <div style={{ fontSize: '11px', color: '#596168', fontFamily: 'monospace' }}>
            {payment.payment.invoice_id}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#17191B' }}>
            {fmtAmount(payment.payment.amount, payment.payment.currency)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 500,
            color: riskColor,
            background: `${riskColor}15`,
            borderRadius: '9999px',
            padding: '2px 8px',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: riskColor,
              display: 'inline-block',
            }}
          />
          {riskLabel} · {normalizeRisk(payment.risk_score)}/100
        </span>
        <span
          style={{
            fontSize: '11px',
            color: statusColor(payment.status),
            fontWeight: 500,
          }}
        >
          {payment.status}
        </span>
      </div>

      <button
        id={`review-btn-${payment.payment.invoice_id}`}
        className="btn-primary"
        style={{ width: '100%', textAlign: 'center', padding: '8px 16px', fontSize: '12px' }}
        onClick={() => onReview(payment.payment.invoice_id)}
      >
        Review Payment
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────
// Recent payments mini-table row
// ──────────────────────────────────────────────

function RecentRow({ p, onClick }: { p: PaymentResult; onClick: () => void }) {
  const sc = statusColor(p.status);

  return (
    <tr
      onClick={onClick}
      style={{ cursor: 'pointer', transition: 'background 180ms ease' }}
      onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'rgba(35,50,65,0.04)')}
      onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
    >
      <td
        style={{
          padding: '11px 16px',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#596168',
          borderBottom: '1px solid rgba(35,50,65,0.06)',
        }}
      >
        {p.payment.invoice_id}
      </td>
      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#17191B', borderBottom: '1px solid rgba(35,50,65,0.06)' }}>
        {p.payment.vendor_name}
      </td>
      <td style={{ padding: '11px 16px', fontSize: '13px', fontWeight: 500, color: '#17191B', borderBottom: '1px solid rgba(35,50,65,0.06)' }}>
        {fmtAmount(p.payment.amount, p.payment.currency)}
      </td>
      <td style={{ padding: '11px 16px', borderBottom: '1px solid rgba(35,50,65,0.06)' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: sc,
            background: `${sc}15`,
            borderRadius: '9999px',
            padding: '2px 8px',
          }}
        >
          {p.status}
        </span>
      </td>
      <td style={{ padding: '11px 16px', borderBottom: '1px solid rgba(35,50,65,0.06)' }}>
        <ArrowUpRight size={14} color="#9DB1BF" />
      </td>
    </tr>
  );
}

// ──────────────────────────────────────────────
// Overview Page
// ──────────────────────────────────────────────

export default function Overview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<PaymentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [screening, setScreening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api.getStats(), api.getPayments()]);
      setStats(s);
      setPayments(p);
    } catch {
      // silently handle — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleScreenBatch = async () => {
    if (screening) return;
    setScreening(true);
    setError(null);
    try {
      await api.screenBatch();
      await loadData();
    } catch (err: unknown) {
      setError((err as Error).message || 'Screening failed.');
    } finally {
      setScreening(false);
    }
  };

  const attentionNeeded = payments.filter(p => p.status === 'HELD' || p.status === 'UNPROCESSABLE');
  const recentPayments = [...payments].reverse().slice(0, 6);
  const allPending = payments.every(p => p.status === 'PENDING') && payments.length > 0;

  // KPI data — only from real backend stats
  const kpis = stats
    ? [
      {
        label: 'Screened',
        value: stats.screened,
        sub: `${stats.clear} cleared`,
      },
      {
        label: 'Held for Review',
        value: stats.held + stats.unprocessable,
        sub: `${stats.approved + stats.rejected} resolved`,
        accent: stats.held + stats.unprocessable > 0 ? '#F04B4B' : undefined,
      },
      {
        label: 'Approved',
        value: stats.approved,
        sub: stats.screened > 0 ? `${Math.round((stats.approved / Math.max(stats.screened, 1)) * 100)}% of screened` : '—',
        accent: stats.approved > 0 ? '#7DBF9A' : undefined,
      },
      {
        label: 'Rejected',
        value: stats.rejected,
        sub: 'Fraud prevented',
        accent: stats.rejected > 0 ? '#F28A45' : undefined,
      },
    ]
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ── Page header ─────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '48px',
              fontWeight: 400,
              lineHeight: 1.05,
              color: '#17191B',
              letterSpacing: '-0.02em',
              marginBottom: '10px',
            }}
          >
            RocketGuard
          </h1>
          {/* Primary tagline — deliberate, distinct from the heading */}
          <p
            style={{
              fontSize: '19px',
              fontWeight: 500,
              color: '#3A4550',
              lineHeight: 1.35,
              letterSpacing: '-0.01em',
              marginBottom: '8px',
              maxWidth: '480px',
            }}
          >
            AI-powered protection for business payments.
          </p>
          {/* Supporting description — clearly subordinate */}
          <p
            style={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#596168',
              lineHeight: 1.55,
              maxWidth: '400px',
            }}
          >
            Screen vendors, detect fraud, protect your business.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <button
            id="screen-batch-btn"
            className="btn-primary"
            onClick={handleScreenBatch}
            disabled={screening || allPending === false && payments.every(p => p.status !== 'PENDING')}
            style={{ fontSize: '13px', padding: '12px 24px' }}
          >
            {screening ? 'Screening…' : '+ Screen Batch'}
          </button>
          {stats && stats.screened > 0 && (
            <span style={{ fontSize: '11px', color: '#9DB1BF' }}>
              {stats.screened} payments processed
            </span>
          )}
        </div>
      </div>

      {/* ── Error banner ────────────────────────── */}
      {error && (
        <div
          style={{
            background: '#FFF5F5',
            border: '1px solid rgba(240,75,75,0.25)',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#F04B4B',
            fontSize: '13px',
          }}
        >
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* ── KPI Cards ───────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
        }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          : kpis.map(k => (
            <KpiCard key={k.label} label={k.label} value={k.value} sub={k.sub} accent={k.accent} />
          ))}
      </div>

      {/* ── Analytics row ───────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>
        {/* Left — screening breakdown */}
        <div className="analytics-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#17191B' }}>
              Screening Breakdown
            </div>
            {stats && stats.screened > 0 && (
              <TrendingUp size={16} color="#9DB1BF" />
            )}
          </div>

          {stats && stats.screened > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Clear', value: stats.clear, color: '#7DBF9A' },
                { label: 'Held', value: stats.held, color: '#F04B4B' },
                { label: 'Approved', value: stats.approved, color: '#7DBF9A' },
                { label: 'Rejected', value: stats.rejected, color: '#F28A45' },
                { label: 'Unprocessable', value: stats.unprocessable, color: '#E9C84A' },
              ].map(item => {
                const pct = stats.screened > 0 ? Math.round((item.value / stats.screened) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', color: '#596168' }}>{item.label}</span>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#17191B' }}>{item.value} · {pct}%</span>
                    </div>
                    <div className="risk-bar-track" style={{ background: 'rgba(35,50,65,0.08)' }}>
                      <div
                        className="risk-bar-fill"
                        style={{ width: `${pct}%`, background: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9DB1BF', fontSize: '13px' }}>
              {loading ? 'Loading…' : 'No screening data yet. Click Screen Batch to begin.'}
            </div>
          )}
        </div>

        {/* Right — pipeline health */}
        <PipelineHealth screened={stats?.screened ?? 0} />
      </div>

      {/* ── Dark investigation workspace ────────── */}
      <div className="workspace-dark">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ color: '#F9FBFD', fontSize: '15px', fontWeight: 600 }}>
            Payments Requiring Attention
          </div>
          <button
            id="view-all-payments-btn"
            onClick={() => navigate('/payments')}
            style={{
              background: 'rgba(249,251,253,0.12)',
              border: 'none',
              borderRadius: '9999px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#C9CED3',
              cursor: 'pointer',
              transition: 'background 180ms ease',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(249,251,253,0.20)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(249,251,253,0.12)')}
          >
            View All Payments →
          </button>
        </div>

        {/* Recent payments list (dark rows) */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: '#525353',
                  borderRadius: '14px',
                  height: '56px',
                  opacity: 1 - i * 0.2,
                  animation: 'shimmer 1.5s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        ) : recentPayments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9DB1BF', fontSize: '13px' }}>
            No payments loaded yet. Click Screen Batch to begin.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '12px', alignItems: 'start' }}>

            {/* Payment list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentPayments.map(p => {
                const isHeld = p.status === 'HELD' || p.status === 'UNPROCESSABLE';
                const sc = statusColor(p.status);
                return (
                  <div
                    key={p.payment.invoice_id}
                    onClick={() => navigate(`/payments?id=${p.payment.invoice_id}`)}
                    className="txn-row"
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#F9FBFD', marginBottom: '3px' }}>
                          {p.payment.vendor_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9DB1BF', fontFamily: 'monospace' }}>
                          {p.payment.invoice_id} · {p.payment.request_type}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#F9FBFD', marginBottom: '3px' }}>
                          {fmtAmount(p.payment.amount, p.payment.currency)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: sc, fontWeight: 500 }}>{p.status}</span>
                          {isHeld && p.risk_score > 0 && (
                            <span style={{ fontSize: '11px', color: '#9DB1BF' }}>{normalizeRisk(p.risk_score)}/100</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Attention column */}
            <div>
              {attentionNeeded.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: '#9DB1BF', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Needs Review
                  </div>
                  {attentionNeeded.slice(0, 3).map(p => (
                    <AttentionCard
                      key={p.payment.invoice_id}
                      payment={p}
                      onReview={(id) => navigate(`/payments?id=${id}`)}
                    />
                  ))}
                  {attentionNeeded.length > 3 && (
                    <button
                      onClick={() => navigate('/payments')}
                      style={{
                        background: 'rgba(249,251,253,0.10)',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '10px',
                        fontSize: '12px',
                        color: '#C9CED3',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      +{attentionNeeded.length - 3} more requiring review
                    </button>
                  )}
                </div>
              ) : stats && stats.screened > 0 ? (
                <div
                  style={{
                    background: 'rgba(125,191,154,0.12)',
                    borderRadius: '16px',
                    padding: '20px',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '13px', color: '#7DBF9A', fontWeight: 500 }}>
                    ✓ All clear — no payments need attention
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    background: '#525353',
                    borderRadius: '16px',
                    padding: '20px',
                    textAlign: 'center',
                    color: '#9DB1BF',
                    fontSize: '13px',
                  }}
                >
                  Run screening to see risk alerts
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Recent payments table ────────────────── */}
      {!loading && recentPayments.length > 0 && (
        <div
          style={{
            background: '#D2E2F9',
            borderRadius: '24px',
            padding: '28px',
            boxShadow: '0 8px 30px rgba(35,50,65,0.07)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#17191B' }}>Recent Payments</div>
            <button
              id="view-all-btn"
              onClick={() => navigate('/payments')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '12px',
                color: '#596168',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              View all →
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Invoice', 'Vendor', 'Amount', 'Status', ''].map(col => (
                  <th
                    key={col}
                    style={{
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#9DB1BF',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '0 16px 12px',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentPayments.map(p => (
                <RecentRow
                  key={p.payment.invoice_id}
                  p={p}
                  onClick={() => navigate(`/payments?id=${p.payment.invoice_id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
