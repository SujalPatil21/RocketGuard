import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { Stats } from '../lib/api';

// ──────────────────────────────────────────────
// Pipeline page
// Shows the actual RocketRide pipeline stages derived from backend data.
// No latency/token data is invented — only real stats from backend.
// ──────────────────────────────────────────────

interface StageProps {
  index: number;
  name: string;
  description: string;
  isActive: boolean;
  isLast?: boolean;
}

function PipelineStage({ index, name, description, isActive, isLast }: StageProps) {
  // Active: green-tinted. Idle: use high-contrast text on dark #525353 surface.
  const idleTitleColor       = '#F4F7FA';   // Near-white — clearly readable on #525353
  const idleDescColor        = '#CBD4DC';   // Light gray — readable but secondary
  const idleStatusColor      = '#AEB9C3';   // Muted but still legible
  const idleCircleBorder     = '#6B7280';   // Visible border on charcoal
  const idleConnectorColor   = 'rgba(174, 185, 195, 0.30)';

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '40px' }}>
        {/* Node circle */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: isActive ? 'rgba(125,191,154,0.15)' : 'rgba(174,185,195,0.12)',
            border: `2px solid ${isActive ? '#7DBF9A' : idleCircleBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {isActive ? (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7DBF9A', display: 'block' }} />
          ) : (
            // High-contrast number on idle circles
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#F4F7FA' }}>{index + 1}</span>
          )}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              minHeight: '32px',
              background: isActive ? 'rgba(125,191,154,0.35)' : idleConnectorColor,
              marginTop: '0',
            }}
          />
        )}
      </div>

      {/* Stage card */}
      <div
        style={{
          flex: 1,
          marginLeft: '16px',
          marginBottom: isLast ? 0 : '10px',
          background: isActive ? 'rgba(125,191,154,0.10)' : 'rgba(82,83,83,0.80)',
          border: `1px solid ${
            isActive ? 'rgba(125,191,154,0.30)' : 'rgba(174,185,195,0.12)'
          }`,
          borderRadius: '16px',
          padding: '16px 20px',
          transition: 'background 300ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px', gap: '12px' }}>
          {/* Stage title — strong weight, high contrast */}
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: isActive ? '#F9FBFD' : idleTitleColor,
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
            }}
          >
            {name}
          </div>
          {/* Status — right-aligned, visible */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isActive ? '#7DBF9A' : '#6B7280',
                display: 'inline-block',
                animation: isActive ? 'pulseDot 2s ease-in-out infinite' : 'none',
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: isActive ? '#7DBF9A' : idleStatusColor,
                letterSpacing: '0.02em',
              }}
            >
              {isActive ? 'Active' : 'Idle'}
            </span>
          </div>
        </div>
        {/* Description — clearly readable secondary text */}
        <div
          style={{
            fontSize: '13px',
            fontWeight: 400,
            color: isActive ? '#C9CED3' : idleDescColor,
            lineHeight: 1.6,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Pipeline Page
// ──────────────────────────────────────────────

export default function Pipeline() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const s = await api.getStats();
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasRun = stats !== null && stats.screened > 0;

  // Real pipeline stages — these are the actual RocketRide pipeline stages
  // as defined in ap_sentinel.pipe. Status is derived from real backend stats.
  const stages = [
    {
      name: 'Payment Ingestion',
      description: 'Payment requests are loaded from the data source and validated for completeness. Records missing required fields (amount, bank account) are marked UNPROCESSABLE.',
    },
    {
      name: 'History Check',
      description: 'The history checker agent reviews vendor payment history against the trusted vendor database. Known vendors with consistent banking details are scored lower risk.',
    },
    {
      name: 'Pattern Detection',
      description: 'The pattern matcher evaluates transaction patterns — unusual amounts, frequency anomalies, and timing irregularities — and may disagree with the history checker.',
    },
    {
      name: 'Risk Scoring',
      description: 'A composite risk score (0–100) is generated from both agent outputs. Payments above the threshold are flagged as HELD and require human review.',
    },
    {
      name: 'Decision & Alert',
      description: 'Final status is assigned: CLEAR (auto-processed), HELD (human review required), or UNPROCESSABLE (data error). Audit events are recorded for all decisions.',
    },
  ];

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
          Pipeline
        </h1>
        <p style={{ fontSize: '14px', color: '#596168' }}>
          RocketRide AI screening pipeline for vendor payment fraud detection.
        </p>
      </div>

      {/* ── Two-column layout ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', alignItems: 'start' }}>

        {/* Left — Pipeline stages */}
        <div className="workspace-dark" style={{ padding: '32px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#F9FBFD', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: hasRun ? '#7DBF9A' : '#92999F',
                animation: hasRun ? 'pulseDot 2s ease-in-out infinite' : 'none',
              }}
            />
            ap_sentinel.pipe
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ background: '#525353', borderRadius: '16px', height: '72px', opacity: 1 - i * 0.12 }} className="skeleton" />
              ))}
            </div>
          ) : (
            <div>
              {stages.map((stage, i) => (
                <PipelineStage
                  key={stage.name}
                  index={i}
                  name={stage.name}
                  description={stage.description}
                  isActive={hasRun}
                  isLast={i === stages.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right — Stats and info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Pipeline stats from backend */}
          <div
            style={{
              background: '#D2E2F9',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 8px 30px rgba(35,50,65,0.07)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#17191B', marginBottom: '18px' }}>
              Pipeline Stats
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 14, borderRadius: 4 }} />
                ))}
              </div>
            ) : stats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Screened',       value: stats.screened },
                  { label: 'Clear',          value: stats.clear },
                  { label: 'Held',           value: stats.held },
                  { label: 'Approved',       value: stats.approved },
                  { label: 'Rejected',       value: stats.rejected },
                  { label: 'Unprocessable',  value: stats.unprocessable },
                  { label: 'Runtime (ms)',   value: stats.runtime_ms },
                  { label: 'Tokens used',    value: stats.tokens },
                ].map(row => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      borderBottom: '1px solid rgba(35,50,65,0.06)',
                      paddingBottom: '10px',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: '#596168' }}>{row.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#17191B', fontFamily: 'monospace' }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#9DB1BF', textAlign: 'center', padding: '16px 0' }}>
                No data yet
              </div>
            )}
          </div>

          {/* Architecture info */}
          <div
            style={{
              background: '#D2E2F9',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 8px 30px rgba(35,50,65,0.07)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#17191B', marginBottom: '16px' }}>
              Architecture
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Engine',   value: 'RocketRide' },
                { label: 'Pipeline', value: 'ap_sentinel.pipe' },
                { label: 'Model',    value: 'llama3.2 (Local)' },
                { label: 'Backend',  value: 'FastAPI + Python' },
                { label: 'Mode',     value: 'Batch (async)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(35,50,65,0.06)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#596168' }}>{row.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#17191B', fontFamily: 'monospace' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status message */}
          {!loading && (
            <div
              style={{
                background: hasRun ? 'rgba(125,191,154,0.12)' : 'rgba(146,153,159,0.12)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 500, color: hasRun ? '#7DBF9A' : '#92999F', marginBottom: '4px' }}>
                {hasRun ? 'Pipeline has run' : 'Pipeline idle'}
              </div>
              <div style={{ fontSize: '11px', color: '#9DB1BF' }}>
                {hasRun
                  ? `${stats?.screened} payments processed`
                  : 'Run a batch from the Overview to activate.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
