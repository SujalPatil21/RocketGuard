import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { ArrowRight, ShieldAlert } from 'lucide-react';

function fmtAmount(amount: number, currency: string = 'USD'): string {
  if (currency === 'INR') return `₹${amount.toLocaleString('en-IN')}`;
  return `${currency} ${amount.toLocaleString()}`;
}

export default function Pipeline() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const c = await api.getCampaigns();
      setCampaigns(c || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ── Header ────────────────────────────── */}
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
          Attack Intelligence Pipeline
        </h1>
        <p style={{ fontSize: '14px', color: '#596168' }}>
          RocketRide AI campaign detection and deterministic relationship correlation.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', alignItems: 'start' }}>

        {/* Left — Campaign Detail */}
        <div className="workspace-dark" style={{ padding: '32px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#F9FBFD', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={18} color="#F04B4B" />
            Active Campaigns
          </div>

          {loading ? (
            <div style={{ color: '#9DB1BF' }}>Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div style={{ color: '#9DB1BF', textAlign: 'center', padding: '40px' }}>
              No active campaigns detected. Run a batch screening to detect campaigns.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {campaigns.map((c, i) => (
                <div key={i} style={{ background: '#525353', borderRadius: '16px', padding: '24px', border: '1px solid rgba(240,75,75,0.3)' }}>
                  
                  {/* Campaign Info */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', color: '#F04B4B', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '4px' }}>
                      CAMPAIGN #{c.id.substring(0,6).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: '#F9FBFD', marginBottom: '8px' }}>
                      {c.campaign_type}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#C9CED3' }}>
                      <span><strong>{c.confidence}%</strong> confidence</span>
                      <span><strong>{fmtAmount(c.total_exposure)}</strong> potential exposure</span>
                      <span><strong>{c.payments.length}</strong> affected payments</span>
                      <span><strong>{c.vendors.length}</strong> affected vendors</span>
                    </div>
                  </div>

                  {/* Relationship Chain */}
                  <div style={{ background: 'rgba(35,50,65,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', color: '#9DB1BF', marginBottom: '12px', fontWeight: 600 }}>ATTACK CHAIN / TIMELINE</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {c.payments.map((pid: string, idx: number) => (
                        <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: '#F04B4B', color: '#FFF', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}>
                            {pid}
                          </span>
                          {idx < c.payments.length - 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#9DB1BF' }}>
                              <ArrowRight size={14} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#9DB1BF', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>Why are these connected?</div>
                      <div style={{ fontSize: '13px', color: '#F9FBFD', lineHeight: 1.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#7DBF9A' }}>✓</span> Same beneficiary account</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#7DBF9A' }}>✓</span> Same requester</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#7DBF9A' }}>✓</span> Close timing</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#7DBF9A' }}>✓</span> Amount escalation</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#9DB1BF', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>Likely Attack Stage</div>
                      <div style={{ fontSize: '14px', color: '#F04B4B', fontWeight: 600, background: 'rgba(240,75,75,0.1)', display: 'inline-block', padding: '4px 10px', borderRadius: '4px' }}>
                        {c.stage.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '12px', color: '#9DB1BF', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>RocketRide Analysis</div>
                    <div style={{ fontSize: '13px', color: '#F9FBFD', lineHeight: 1.6 }}>
                      {c.reasoning}
                    </div>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <div style={{ fontSize: '12px', color: '#9DB1BF', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>Recommended Action</div>
                    <div style={{ fontSize: '13px', color: '#E9C84A', fontWeight: 500 }}>
                      Immediately HOLD all connected transactions and verify the bank account change with vendors via out-of-band communication.
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Stats and info */}
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
              Intelligence Architecture
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Data Source', value: 'SQLite' },
                { label: 'Correlation', value: 'Deterministic Python' },
                { label: 'Engine',   value: 'RocketRide' },
                { label: 'Pipeline', value: 'ap_sentinel.pipe' },
                { label: 'Model',    value: 'llama3.2 (Local)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(35,50,65,0.06)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#596168' }}>{row.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#17191B', fontFamily: 'monospace' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
