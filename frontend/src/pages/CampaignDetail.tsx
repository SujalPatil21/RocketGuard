import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Link2, Clock, Bot } from 'lucide-react';
import { api } from '../lib/api';
import type { Campaign, PaymentResult, RelationshipEdge } from '../lib/api';

function fmtAmount(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') return `₹${amount.toLocaleString('en-IN')}`;
  return `${currency} ${amount.toLocaleString()}`;
}

function confidenceColor(confidence: number): string {
  if (confidence >= 85) return '#F04B4B';
  if (confidence >= 70) return '#F28A45';
  if (confidence >= 50) return '#E9C84A';
  if (confidence > 0) return '#92999F';
  return '#9DB1BF';
}

const RELATIONSHIP_LABEL: Record<string, string> = {
  SHARES_ACCOUNT: 'Shared bank account',
  SHARES_REQUESTER: 'Shared requester',
  SHARES_VENDOR: 'Shared vendor',
  TEMPORALLY_NEAR: 'Submitted within 72 hours',
  AMOUNT_ESCALATES: 'Amount escalation',
};

export default function CampaignDetail() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [payments, setPayments] = useState<PaymentResult[]>([]);
  const [relationships, setRelationships] = useState<RelationshipEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const [c, p, r] = await Promise.all([
        api.getCampaign(campaignId),
        api.getCampaignPayments(campaignId),
        api.getCampaignRelationships(campaignId),
      ]);
      setCampaign(c);
      setPayments(p);
      setRelationships(r.relationships);
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load campaign.');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 100, borderRadius: 20 }} />
        ))}
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div style={{ background: '#FFF5F5', border: '1px solid rgba(240,75,75,0.25)', borderRadius: '14px', padding: '18px', color: '#F04B4B', fontSize: '13px' }}>
        <AlertTriangle size={15} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        {error || 'Campaign not found.'}
      </div>
    );
  }

  const cc = confidenceColor(campaign.confidence);
  const isFallback = campaign.confidence === 0 && /AI Analysis Failed/.test(campaign.reasoning || '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <button
        onClick={() => navigate('/attack-intelligence')}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#596168', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: 0, width: 'fit-content' }}
      >
        <ArrowLeft size={14} /> Back to Attack Intelligence
      </button>

      <div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', fontWeight: 400, color: '#17191B', letterSpacing: '-0.02em', marginBottom: '8px' }}>
          {campaign.campaign_type}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: cc, background: `${cc}20`, borderRadius: '9999px', padding: '3px 10px' }}>
            {campaign.status}
          </span>
          <span style={{ fontSize: '13px', color: '#596168' }}>Stage: <strong style={{ color: '#17191B' }}>{campaign.stage}</strong></span>
          <span style={{ fontSize: '13px', color: '#596168' }}>Confidence: <strong style={{ color: cc }}>{Math.round(campaign.confidence)}%</strong></span>
          <span style={{ fontSize: '13px', color: '#596168' }}>Exposure: <strong style={{ color: '#17191B' }}>{fmtAmount(campaign.total_exposure)}</strong></span>
        </div>
      </div>

      {/* RocketRide Assessment */}
      <div className="workspace-dark">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F9FBFD', fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>
          <Bot size={18} />
          RocketRide Assessment
        </div>
        {isFallback ? (
          <div style={{ background: 'rgba(242,138,69,0.15)', border: '1px solid rgba(242,138,69,0.3)', borderRadius: '14px', padding: '16px', color: '#F28A45', fontSize: '13px', lineHeight: 1.6 }}>
            AI reasoning unavailable when this campaign was created — the RocketRide engine could not be reached.
            This campaign was still detected from real, deterministic relationship evidence (below); only the
            narrative explanation is missing.
            <div style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '11px', color: '#F9FBFD', opacity: 0.7 }}>{campaign.reasoning}</div>
          </div>
        ) : (
          <p style={{ color: '#F9FBFD', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{campaign.reasoning}</p>
        )}
      </div>

      {/* Connected Payments */}
      <div className="analytics-card">
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#17191B', marginBottom: '16px' }}>
          Connected Payments ({payments.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {payments.map(p => (
            <div
              key={p.payment.invoice_id}
              onClick={() => navigate(`/payments?id=${p.payment.invoice_id}`)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FBFD', borderRadius: '12px', padding: '12px 16px', cursor: 'pointer' }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#17191B' }}>{p.payment.vendor_name}</div>
                <div style={{ fontSize: '11px', color: '#596168', fontFamily: 'monospace' }}>{p.payment.invoice_id} · {p.payment.requested_by}</div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#17191B' }}>{fmtAmount(p.payment.amount, p.payment.currency)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Relationship Evidence */}
      <div className="analytics-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600, color: '#17191B', marginBottom: '16px' }}>
          <Link2 size={16} />
          Relationship Evidence ({relationships.length})
        </div>
        {relationships.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9DB1BF', fontSize: '13px' }}>
            No graph-backed relationships recorded for this campaign yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {relationships.map((r, i) => (
              <div key={i} style={{ background: '#F9FBFD', borderRadius: '12px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', color: '#4A6070', background: 'rgba(74,96,112,0.10)', borderRadius: '9999px', padding: '2px 8px' }}>
                    {RELATIONSHIP_LABEL[r.relationship] || r.relationship}
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#596168' }}>{r.from} ↔ {r.to}</span>
                </div>
                {r.evidence && <div style={{ fontSize: '12px', color: '#17191B' }}>{r.evidence}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="analytics-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600, color: '#17191B', marginBottom: '16px' }}>
          <Clock size={16} />
          Timeline
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[...payments]
            .sort((a, b) => (a.payment.submitted_at || '').localeCompare(b.payment.submitted_at || ''))
            .map(p => (
              <div key={p.payment.invoice_id} style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#596168', minWidth: '150px' }}>
                  {p.payment.submitted_at}
                </span>
                <span style={{ fontSize: '12px', color: '#17191B' }}>
                  {p.payment.invoice_id} — {fmtAmount(p.payment.amount, p.payment.currency)} to {p.payment.vendor_name}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
