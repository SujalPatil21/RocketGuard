import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import type { PaymentResult } from '../lib/api';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function fmtAmount(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') return `₹${amount.toLocaleString('en-IN')}`;
  return `${currency} ${amount.toLocaleString()}`;
}

function riskColor(score: number): string {
  if (score >= 80) return '#F04B4B';
  if (score >= 60) return '#F28A45';
  if (score >= 40) return '#E9C84A';
  if (score > 0)   return '#7DBF9A';
  return '#92999F';
}

function statusColor(status: string): string {
  switch (status) {
    case 'CLEAR':         return '#7DBF9A';
    case 'HELD':          return '#F04B4B';
    case 'APPROVED':      return '#7DBF9A';
    case 'REJECTED':      return '#F04B4B';
    case 'UNPROCESSABLE': return '#E9C84A';
    default:              return '#92999F';
  }
}

type FilterType = 'All' | 'HELD' | 'CLEAR' | 'APPROVED' | 'REJECTED' | 'UNPROCESSABLE' | 'PENDING';

// ──────────────────────────────────────────────
// Risk bar
// ──────────────────────────────────────────────

function RiskBar({ score }: { score: number }) {
  const color = riskColor(score);
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
          Risk Score
        </span>
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '24px',
            fontWeight: 500,
            color,
          }}
        >
          {score}<span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>/100</span>
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: '5px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: '100%',
            background: color,
            borderRadius: '9999px',
            transition: 'width 300ms ease',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>LOW</span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>CRITICAL</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Transaction row
// ──────────────────────────────────────────────

interface TxnRowProps {
  payment: PaymentResult;
  isSelected: boolean;
  onClick: () => void;
}

function TxnRow({ payment, isSelected, onClick }: TxnRowProps) {
  const sc = statusColor(payment.status);
  const rc = riskColor(payment.risk_score);

  return (
    <div
      onClick={onClick}
      className={`txn-row${isSelected ? ' selected' : ''}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: isSelected ? '#17191B' : '#F9FBFD', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {payment.payment.vendor_name}
          </div>
          <div style={{ fontSize: '11px', color: isSelected ? '#596168' : '#9DB1BF', fontFamily: 'monospace' }}>
            {payment.payment.invoice_id}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#17191B' : '#F9FBFD', marginBottom: '3px' }}>
            {fmtAmount(payment.payment.amount, payment.payment.currency)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '10px', fontWeight: 500, color: sc }}>{payment.status}</span>
            {payment.risk_score > 0 && (
              <span style={{ fontSize: '10px', color: rc, fontWeight: 600 }}>{payment.risk_score}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Detail Panel
// ──────────────────────────────────────────────

interface DetailPanelProps {
  payment: PaymentResult;
  onClose: () => void;
  onApproved: (p: PaymentResult) => void;
  onRejected: (p: PaymentResult) => void;
}

function DetailPanel({ payment, onClose, onApproved, onRejected }: DetailPanelProps) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canAct = payment.status === 'HELD' || payment.status === 'UNPROCESSABLE';
  const sc = statusColor(payment.status);

  const handleApprove = async () => {
    if (approving || rejecting) return;
    setApproving(true);
    setActionError(null);
    try {
      const updated = await api.approvePayment(payment.payment.invoice_id);
      onApproved(updated);
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Approval failed.');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (approving || rejecting) return;
    setRejecting(true);
    setActionError(null);
    try {
      const updated = await api.rejectPayment(payment.payment.invoice_id);
      onRejected(updated);
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Rejection failed.');
    } finally {
      setRejecting(false);
    }
  };

  const p = payment.payment;
  const hcr = payment.history_checker_result;

  return (
    <div
      className="detail-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        animation: 'fadeIn 0.18s ease-out',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          {/* Invoice ID — clearly visible on #849FB0 panel */}
          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#3E5462', marginBottom: '4px', fontWeight: 500 }}>
            {p.invoice_id}
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#17191B',
              marginBottom: '4px',
            }}
          >
            {p.vendor_name}
          </div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: sc,
              background: `${sc}25`,
              borderRadius: '9999px',
              padding: '2px 8px',
            }}
          >
            {payment.status}
          </span>
        </div>
        <button
          id="close-detail-btn"
          onClick={onClose}
          style={{
            background: 'rgba(23,25,27,0.15)',
            border: 'none',
            borderRadius: '50%',
            width: 30,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={14} color="#17191B" />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Risk score bar */}
        {payment.risk_score > 0 && (
          <div
            style={{
              background: '#323232',
              borderRadius: '14px',
              padding: '16px',
            }}
          >
            <RiskBar score={payment.risk_score} />
          </div>
        )}

        {/* Payment info */}
        <div style={{ background: 'rgba(255,255,255,0.35)', borderRadius: '14px', padding: '16px' }}>
          {/* Section header — explicit color, not low-opacity */}
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3E5462', marginBottom: '12px' }}>
            Payment Details
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Amount',    value: fmtAmount(p.amount, p.currency) },
              { label: 'Requester', value: p.requested_by },
              { label: 'Bank',      value: `••••${p.bank_account.slice(-4)}` },
              { label: 'IFSC',      value: p.ifsc },
              { label: 'Due',       value: p.due_date },
              { label: 'Type',      value: p.request_type },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                {/* Label — solid color, clearly readable */}
                <span style={{ fontSize: '12px', color: '#4A6070', fontWeight: 500 }}>{row.label}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#17191B', fontFamily: row.label === 'Bank' || row.label === 'IFSC' ? 'monospace' : 'inherit' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          {p.request_message && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(23,25,27,0.12)' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#3E5462', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Message</div>
              <div style={{ fontSize: '12px', color: '#17191B', lineHeight: 1.5 }}>{p.request_message}</div>
            </div>
          )}
        </div>

        {/* AI Screening result */}
        {hcr && (
          <div style={{ background: 'rgba(50,50,50,0.18)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3E5462', marginBottom: '12px' }}>
              Screening Result
            </div>
            {hcr.summary && (
              <p style={{ fontSize: '12px', color: '#17191B', lineHeight: 1.6, marginBottom: '10px' }}>
                {hcr.summary}
              </p>
            )}
            {payment.signals && payment.signals.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {payment.signals.map((sig, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '12px',
                      color: '#17191B',
                      background: 'rgba(240,75,75,0.10)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ color: '#F04B4B', fontSize: '10px' }}>●</span>
                    {sig}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Verification */}
        {payment.verifier_result?.verificationRequired && (
          <div style={{ background: 'rgba(233,200,74,0.18)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(233,200,74,0.35)' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3E5462', marginBottom: '8px' }}>
              Verification Required
            </div>
            <p style={{ fontSize: '12px', color: '#17191B', lineHeight: 1.5, marginBottom: '6px' }}>
              {payment.verifier_result.instruction}
            </p>
            {payment.verifier_result.trustedSource && (
              <p style={{ fontSize: '11px', color: '#4A6070', fontWeight: 500 }}>
                Source: <span style={{ fontWeight: 600, color: '#17191B' }}>{payment.verifier_result.trustedSource}</span>
              </p>
            )}
          </div>
        )}

        {/* Audit trail */}
        {payment.audit_events.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3E5462', marginBottom: '10px' }}>
              Audit Trail
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {payment.audit_events.slice().reverse().map((evt, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px' }}>
                  {/* Timestamp — was rgba(23,25,27,0.40), nearly invisible */}
                  <span style={{ fontSize: '10px', color: '#4A6070', fontFamily: 'monospace', whiteSpace: 'nowrap', paddingTop: '2px', minWidth: '42px', fontWeight: 500 }}>
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#17191B' }}>
                      {evt.type.replace(/_/g, ' ')}
                    </div>
                    {/* Message — was rgba(23,25,27,0.55), now explicit readable color */}
                    <div style={{ fontSize: '11px', color: '#3E5462', fontWeight: 500 }}>{evt.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action area */}
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(23,25,27,0.12)' }}>
        {actionError && (
          <div style={{ fontSize: '12px', color: '#F04B4B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={12} /> {actionError}
          </div>
        )}

        {canAct ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              id={`reject-btn-${payment.payment.invoice_id}`}
              className="btn-danger"
              onClick={handleReject}
              disabled={rejecting || approving}
              style={{ textAlign: 'center' }}
            >
              {rejecting ? 'Rejecting…' : 'Reject'}
            </button>
            <button
              id={`approve-btn-${payment.payment.invoice_id}`}
              className="btn-primary"
              onClick={handleApprove}
              disabled={approving || rejecting}
              style={{ textAlign: 'center' }}
            >
              {approving ? 'Approving…' : 'Approve'}
            </button>
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '10px',
              background: `${statusColor(payment.status)}15`,
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              color: statusColor(payment.status),
            }}
          >
            {payment.status === 'CLEAR' ? 'Payment Cleared by AI' : payment.status}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Payments Page
// ──────────────────────────────────────────────

export default function Payments() {
  const navigate = useNavigate();
  const location = useLocation();
  const [payments, setPayments] = useState<PaymentResult[]>([]);
  const [selected, setSelected] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('All');
  const [search, setSearch] = useState('');
  const loadedId = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getPayments();
      setPayments(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().then(data => {
      const params = new URLSearchParams(location.search);
      const id = params.get('id');
      if (id && id !== loadedId.current) {
        loadedId.current = id;
        const found = data.find(p => p.payment.invoice_id === id);
        if (found) setSelected(found);
        navigate('/payments', { replace: true });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApproved = async (updated: PaymentResult) => {
    setSelected(updated);
    const fresh = await load();
    const refreshed = fresh.find(p => p.payment.invoice_id === updated.payment.invoice_id);
    if (refreshed) setSelected(refreshed);
  };

  const handleRejected = async (updated: PaymentResult) => {
    setSelected(updated);
    const fresh = await load();
    const refreshed = fresh.find(p => p.payment.invoice_id === updated.payment.invoice_id);
    if (refreshed) setSelected(refreshed);
  };

  // Filter options that have at least 1 payment
  const statusCounts: Record<string, number> = {};
  payments.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });

  const filters: FilterType[] = ['All', 'HELD', 'UNPROCESSABLE', 'CLEAR', 'APPROVED', 'REJECTED', 'PENDING'];

  const filtered = payments.filter(p => {
    const matchFilter = filter === 'All' || p.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.payment.invoice_id.toLowerCase().includes(q) ||
      p.payment.vendor_name.toLowerCase().includes(q) ||
      p.payment.requested_by.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Page header ─────────────────────────── */}
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
          Payments
        </h1>
        <p style={{ fontSize: '14px', color: '#596168' }}>
          Review screened vendor payment requests. {payments.length > 0 && `${payments.length} total.`}
        </p>
      </div>

      {/* ── Dark workspace ────────────────────── */}
      <div className="workspace-dark" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '600px' }}>

        {/* Workspace toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {filters.map(f => {
              const count = f === 'All' ? payments.length : (statusCounts[f] || 0);
              if (f !== 'All' && count === 0) return null;
              return (
                <button
                  key={f}
                  id={`filter-${f}`}
                  onClick={() => setFilter(f)}
                  className={`filter-pill${filter === f ? ' active' : ''}`}
                >
                  {f === 'UNPROCESSABLE' ? 'Unprocessable' : f === 'All' ? `All ${payments.length}` : `${f} ${count}`}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} color="#9DB1BF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              id="payment-search"
              type="text"
              placeholder="Search invoice, vendor…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-light"
              style={{ paddingLeft: '32px', width: '220px' }}
            />
          </div>
        </div>

        {/* Content: list + detail */}
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: '12px', alignItems: 'start' }}>

          {/* Transaction list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: '#525353',
                    borderRadius: '14px',
                    height: '60px',
                    opacity: 1 - i * 0.15,
                  }}
                  className="skeleton"
                />
              ))
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9DB1BF', fontSize: '13px' }}>
                {search || filter !== 'All' ? 'No payments match your filter.' : 'No payments loaded yet.'}
              </div>
            ) : (
              filtered.map(p => (
                <TxnRow
                  key={p.payment.invoice_id}
                  payment={p}
                  isSelected={selected?.payment.invoice_id === p.payment.invoice_id}
                  onClick={() => setSelected(selected?.payment.invoice_id === p.payment.invoice_id ? null : p)}
                />
              ))
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ position: 'sticky', top: '80px' }}>
              <DetailPanel
                payment={selected}
                onClose={() => setSelected(null)}
                onApproved={handleApproved}
                onRejected={handleRejected}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
