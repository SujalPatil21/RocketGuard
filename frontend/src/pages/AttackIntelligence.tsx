import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { api } from '../lib/api';
import type { Campaign } from '../lib/api';

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

function KpiTile({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="kpi-card">
      <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#596168', marginBottom: '12px' }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '36px', fontWeight: 500, lineHeight: 1.1, color: accent ?? '#17191B' }}>
        {value}
      </div>
    </div>
  );
}

function CampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const cc = confidenceColor(campaign.confidence);
  const isFallback = campaign.confidence === 0 && /AI Analysis Failed/.test(campaign.reasoning || '');

  return (
    <div onClick={onClick} className="txn-row" style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#F9FBFD', marginBottom: '4px' }}>
            {campaign.campaign_type}
          </div>
          <div style={{ fontSize: '11px', color: '#9DB1BF', marginBottom: '8px' }}>
            {campaign.payments.length} payments · {campaign.vendors.length} vendors · {campaign.stage}
          </div>
          {isFallback && (
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#F28A45', background: 'rgba(242,138,69,0.15)', borderRadius: '9999px', padding: '2px 8px' }}>
              AI unavailable — deterministic evidence only
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#F9FBFD', marginBottom: '4px' }}>
            {fmtAmount(campaign.total_exposure)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cc, display: 'inline-block' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: cc }}>{Math.round(campaign.confidence)}% confidence</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AttackIntelligence() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalExposure = campaigns.reduce((sum, c) => sum + c.total_exposure, 0);
  const affectedPayments = new Set(campaigns.flatMap(c => c.payments)).size;
  const affectedVendors = new Set(campaigns.flatMap(c => c.vendors)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '36px', fontWeight: 400, color: '#17191B', letterSpacing: '-0.02em', marginBottom: '6px' }}>
          Attack Intelligence
        </h1>
        <p style={{ fontSize: '14px', color: '#596168' }}>
          Coordinated fraud campaigns discovered from real relationship evidence — not scenario labels.
        </p>
      </div>

      {error && (
        <div style={{ background: '#FFF5F5', border: '1px solid rgba(240,75,75,0.25)', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', color: '#F04B4B', fontSize: '13px' }}>
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <KpiTile label="Active Campaigns" value={campaigns.length} accent={campaigns.length > 0 ? '#F04B4B' : undefined} />
        <KpiTile label="Total Exposure" value={fmtAmount(totalExposure)} accent={totalExposure > 0 ? '#F04B4B' : undefined} />
        <KpiTile label="Affected Payments" value={affectedPayments} />
        <KpiTile label="Affected Vendors" value={affectedVendors} />
      </div>

      <div className="workspace-dark" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F9FBFD', fontSize: '15px', fontWeight: 600 }}>
          <ShieldAlert size={18} />
          Active Campaigns
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ background: '#525353', borderRadius: '14px', height: '70px', opacity: 1 - i * 0.15 }} />
            ))
          ) : campaigns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9DB1BF', fontSize: '13px' }}>
              No coordinated campaigns detected in the current dataset mode.
            </div>
          ) : (
            campaigns.map(c => (
              <CampaignCard key={c.id} campaign={c} onClick={() => navigate(`/attack-intelligence/${c.id}`)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
