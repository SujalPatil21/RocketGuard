import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────
// Design tokens (matches existing dashboard system)
// ─────────────────────────────────────────────────────────────────
const C = {
  bg:         '#E4EBF5',
  surface:    '#F9FBFD',
  surfaceAlt: '#D2E2F9',
  dark:       '#323232',
  darkAlt:    '#525353',
  selected:   '#849FB0',
  lime:       '#DDF625',
  textPrimary:'#17191B',
  textSecond: '#596168',
  textMuted:  '#9DB1BF',
  clear:      '#7DBF9A',
  held:       '#F04B4B',
  warning:    '#F28A45',
};

// ─────────────────────────────────────────────────────────────────
// Scroll-reveal hook
// ─────────────────────────────────────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─────────────────────────────────────────────────────────────────
// Landing Header
// ─────────────────────────────────────────────────────────────────
function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrolled ? 'rgba(228,235,245,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(35,50,65,0.08)' : '1px solid transparent',
        padding: '0 40px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'background 250ms ease, border-color 250ms ease, backdrop-filter 250ms ease',
      }}
    >
      {/* Wordmark */}
      <a 
        href="/"
        onClick={(e) => {
          if (window.location.pathname === '/') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            window.history.replaceState(null, '', '/');
          }
        }}
        style={{ textDecoration: 'none' }}
      >
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: '22px',
            letterSpacing: '-0.03em',
            color: C.textPrimary,
            lineHeight: 1,
          }}
        >
          RocketGuard
        </span>
      </a>

      {/* Center nav links */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        {[
          { label: 'How it works', href: '#how-it-works' },
          { label: 'Features',     href: '#features'     },
          { label: 'Security',     href: '#security'     },
        ].map(({ label, href }) => (
          <a
            key={label}
            href={href}
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: C.textSecond,
              textDecoration: 'none',
              transition: 'color 180ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = C.textPrimary)}
            onMouseLeave={e => (e.currentTarget.style.color = C.textSecond)}
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Auth actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link
          id="header-sign-in"
          to="/sign-in"
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: C.textSecond,
            textDecoration: 'none',
            padding: '8px 16px',
            borderRadius: '9999px',
            transition: 'color 180ms ease, background 180ms ease',
            background: 'transparent',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = C.textPrimary;
            e.currentTarget.style.background = 'rgba(35,50,65,0.06)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = C.textSecond;
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Sign In
        </Link>
        <Link
          id="header-sign-up"
          to="/sign-up"
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: C.textPrimary,
            textDecoration: 'none',
            padding: '9px 20px',
            borderRadius: '9999px',
            background: C.lime,
            transition: 'transform 180ms ease, box-shadow 180ms ease',
            boxShadow: '0 2px 8px rgba(221,246,37,0.30)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(221,246,37,0.40)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(221,246,37,0.30)';
          }}
        >
          Sign Up
        </Link>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────
// Hero Section
// ─────────────────────────────────────────────────────────────────
function HeroSection() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  return (
    <section
      style={{
        minHeight: '100vh',
        background: C.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 40px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 900,
          height: 600,
          background: 'radial-gradient(ellipse, rgba(221,246,37,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 500ms ease, transform 500ms ease',
          maxWidth: 760,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: C.dark,
            color: C.lime,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            borderRadius: '9999px',
            padding: '6px 14px',
            marginBottom: 32,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.lime, display: 'inline-block', animation: 'pulseDot 2s ease-in-out infinite' }} />
          Payment Fraud Screening
        </div>

        {/* Hero heading */}
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(44px, 6vw, 68px)',
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: C.textPrimary,
            marginBottom: 24,
          }}
        >
          Protect every payment<br />
          <span style={{ color: C.textSecond }}>before money moves.</span>
        </h1>

        {/* Primary tagline */}
        <p
          style={{
            fontSize: 'clamp(17px, 2vw, 20px)',
            fontWeight: 500,
            color: '#3A4550',
            lineHeight: 1.35,
            letterSpacing: '-0.01em',
            marginBottom: 10,
          }}
        >
          AI-powered protection for business payments.
        </p>

        {/* Supporting description */}
        <p
          style={{
            fontSize: 15,
            fontWeight: 400,
            color: C.textSecond,
            lineHeight: 1.6,
            maxWidth: 520,
            margin: '0 auto 40px',
          }}
        >
          RocketGuard screens business payments for fraud signals, vendor anomalies,
          and suspicious requests — helping teams stop risky payments before they
          become costly incidents.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            id="hero-get-started"
            onClick={() => navigate('/sign-up')}
            style={{
              background: C.dark,
              color: C.surface,
              border: 'none',
              borderRadius: '9999px',
              padding: '14px 32px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 180ms ease, box-shadow 180ms ease',
              boxShadow: '0 4px 16px rgba(35,50,65,0.20)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 28px rgba(35,50,65,0.28)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(35,50,65,0.20)';
            }}
          >
            Get Started
          </button>
          <button
            id="hero-sign-in"
            onClick={() => navigate('/sign-in')}
            style={{
              background: 'rgba(35,50,65,0.08)',
              color: C.textPrimary,
              border: 'none',
              borderRadius: '9999px',
              padding: '14px 32px',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 180ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(35,50,65,0.13)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(35,50,65,0.08)')}
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Product preview card */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 600ms ease 200ms, transform 600ms ease 200ms',
          marginTop: 64,
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 860,
        }}
      >
        <ProductPreviewCard />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// Product Preview Card (pipeline visual)
// ─────────────────────────────────────────────────────────────────
function ProductPreviewCard() {
  const payments = [
    { id: 'INV-8821', vendor: 'Stark Office Supplies',  amount: '₹84,500',  status: 'CLEAR', risk: 12  },
    { id: 'INV-8822', vendor: 'Meridian Consulting LLC', amount: '₹2,40,000', status: 'HELD',  risk: 78  },
    { id: 'INV-8823', vendor: 'BlueSky Logistics',      amount: '₹31,200',  status: 'CLEAR', risk: 8   },
  ];

  const statusColor = (s: string) => s === 'CLEAR' ? C.clear : C.held;
  const riskColor  = (r: number) => r >= 60 ? C.held : r >= 40 ? C.warning : C.clear;

  return (
    <div
      style={{
        background: C.dark,
        borderRadius: 24,
        padding: '24px 28px',
        boxShadow: '0 24px 64px rgba(35,50,65,0.20)',
        textAlign: 'left',
      }}
    >
      {/* Workspace chrome */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.clear, display: 'inline-block', animation: 'pulseDot 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#F9FBFD', letterSpacing: '0.02em' }}>
            Payment Screening — Live
          </span>
        </div>
        <span style={{ fontSize: 11, color: C.textMuted, fontFamily: 'monospace' }}>ap_sentinel.pipe</span>
      </div>

      {/* Payment rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {payments.map((p, i) => {
          const sc = statusColor(p.status);
          const rc = riskColor(p.risk);
          return (
            <div
              key={p.id}
              style={{
                background: '#525353',
                borderRadius: 14,
                padding: '13px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                animation: `fadeIn 0.3s ease ${i * 0.08}s both`,
                border: p.status === 'HELD' ? `1px solid rgba(240,75,75,0.25)` : '1px solid transparent',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#F4F7FA', marginBottom: 2 }}>{p.vendor}</div>
                <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'monospace' }}>{p.id}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F4F7FA' }}>{p.amount}</div>
                  <div style={{ fontSize: 10, color: rc, fontWeight: 600 }}>Risk {p.risk}/100</div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: sc,
                    background: `${sc}20`,
                    borderRadius: '9999px',
                    padding: '3px 10px',
                    minWidth: 48,
                    textAlign: 'center',
                  }}
                >
                  {p.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline stages below */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          marginTop: 20,
          padding: '14px 0 4px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {[
          { label: 'Ingestion',         done: true  },
          { label: 'History Check',     done: true  },
          { label: 'Pattern Detection', done: true  },
          { label: 'Risk Decision',     done: false },
        ].map((stage, i, arr) => (
          <div key={stage.label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: stage.done ? C.clear : 'rgba(255,255,255,0.25)',
                  margin: '0 auto 4px',
                  boxShadow: stage.done ? `0 0 6px ${C.clear}80` : 'none',
                }}
              />
              <div style={{ fontSize: 10, color: stage.done ? '#CBD4DC' : 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', fontWeight: stage.done ? 500 : 400 }}>
                {stage.label}
              </div>
            </div>
            {i < arr.length - 1 && (
              <div style={{ width: 40, height: 1, background: stage.done ? 'rgba(125,191,154,0.40)' : 'rgba(255,255,255,0.12)', margin: '0 6px', marginBottom: 14 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// How It Works
// ─────────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const { ref, visible } = useReveal();

  const steps = [
    {
      num: '01',
      title: 'Payment Ingestion',
      desc: 'Payment requests are loaded from the data source and validated for completeness. Missing required fields are flagged as unprocessable.',
    },
    {
      num: '02',
      title: 'History Check',
      desc: 'The history checker agent reviews vendor payment history against the trusted vendor database. Known vendors with consistent banking details score lower risk.',
    },
    {
      num: '03',
      title: 'Pattern Detection',
      desc: 'The pattern matcher evaluates transaction patterns — unusual amounts, frequency anomalies, and timing irregularities. Agents may disagree, surfacing contradictions.',
    },
    {
      num: '04',
      title: 'Risk Decision',
      desc: 'A composite risk score is generated. Payments below threshold are cleared automatically. High-risk payments are held and routed to a human reviewer.',
    },
  ];

  return (
    <section
      id="how-it-works"
      style={{ background: C.bg, padding: '100px 40px', scrollMarginTop: 64 }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 500ms ease, transform 500ms ease',
          }}
        >
          {/* Section label */}
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 12 }}>
            How it works
          </div>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(28px, 3.5vw, 42px)',
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: C.textPrimary,
              marginBottom: 56,
              lineHeight: 1.1,
            }}
          >
            Four stages, one decision.
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            {steps.map((step, i) => (
              <div
                key={step.num}
                style={{
                  background: C.surface,
                  borderRadius: 24,
                  padding: '28px 24px',
                  boxShadow: '0 4px 16px rgba(35,50,65,0.06)',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(16px)',
                  transition: `opacity 400ms ease ${i * 80}ms, transform 400ms ease ${i * 80}ms`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 36,
                    fontWeight: 300,
                    color: 'rgba(35,50,65,0.12)',
                    lineHeight: 1,
                  }}
                >
                  {step.num}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary }}>{step.title}</div>
                <div style={{ fontSize: 13, fontWeight: 400, color: C.textSecond, lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// Fraud signals section
// ─────────────────────────────────────────────────────────────────
function FeaturesSection() {
  const { ref, visible } = useReveal();

  const signals = [
    { label: 'Unusual amount',           desc: 'Payment significantly deviates from vendor history.' },
    { label: 'Vendor history mismatch',  desc: 'Bank account or IFSC differs from prior transactions.' },
    { label: 'Urgency pattern',          desc: 'Request explicitly pressures fast payment without process.' },
    { label: 'Beneficiary change',       desc: 'Payout destination changed shortly before submission.' },
    { label: 'BEC indicators',           desc: 'Request pattern matches known Business Email Compromise signals.' },
    { label: 'Contradictory signals',    desc: 'History checker and pattern detector disagree — elevated caution.' },
  ];

  return (
    <section
      id="features"
      style={{ background: C.surfaceAlt, padding: '100px 40px', scrollMarginTop: 64 }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div ref={ref}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 12 }}>
            What we detect
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: 48,
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(28px, 3.5vw, 42px)',
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: C.textPrimary,
                lineHeight: 1.1,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 500ms ease, transform 500ms ease',
              }}
            >
              Fraud signals<br />RocketGuard recognises.
            </h2>
            {/* Clear / Held split */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                opacity: visible ? 1 : 0,
                transition: 'opacity 500ms ease 200ms',
              }}
            >
              {[
                { status: 'CLEAR', color: C.clear, text: 'Payment looks consistent with trusted vendor history.' },
                { status: 'HELD',  color: C.held,  text: 'Payment requires human review before proceeding.' },
              ].map(item => (
                <div
                  key={item.status}
                  style={{
                    background: C.surface,
                    borderRadius: 18,
                    padding: '18px 20px',
                    maxWidth: 200,
                    boxShadow: '0 4px 16px rgba(35,50,65,0.06)',
                    border: `1px solid ${item.color}30`,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: item.color, letterSpacing: '0.08em', marginBottom: 6 }}>{item.status}</div>
                  <div style={{ fontSize: 12, color: C.textSecond, lineHeight: 1.5 }}>{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Signal grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {signals.map((sig, i) => (
              <div
                key={sig.label}
                style={{
                  background: C.surface,
                  borderRadius: 16,
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  boxShadow: '0 2px 8px rgba(35,50,65,0.05)',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(12px)',
                  transition: `opacity 400ms ease ${i * 60}ms, transform 400ms ease ${i * 60}ms`,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: C.held,
                    flexShrink: 0,
                    marginTop: 5,
                  }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 4 }}>{sig.label}</div>
                  <div style={{ fontSize: 12, color: C.textSecond, lineHeight: 1.5 }}>{sig.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// Security / Trust section
// ─────────────────────────────────────────────────────────────────
function SecuritySection() {
  const { ref, visible } = useReveal();

  const principles = [
    { title: 'Local AI processing',  desc: 'All screening runs on local infrastructure. Payment data does not leave your network.' },
    { title: 'Human review',         desc: 'Risky payments are never automatically rejected. A human reviewer has the final say.' },
    { title: 'Full audit trail',     desc: 'Every decision — clear, held, approved, rejected — is recorded with timestamp and reasoning.' },
    { title: 'Deterministic policy', desc: 'Risk thresholds are defined and consistent. No opaque black-box outputs.' },
  ];

  return (
    <section
      id="security"
      style={{ background: C.dark, padding: '100px 40px', scrollMarginTop: 64 }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div ref={ref}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 12 }}>
            Security principles
          </div>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(28px, 3.5vw, 42px)',
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: '#F4F7FA',
              marginBottom: 56,
              lineHeight: 1.1,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 500ms ease, transform 500ms ease',
            }}
          >
            Designed for operations teams<br />
            <span style={{ color: C.textMuted }}>that need to trust the tool.</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {principles.map((p, i) => (
              <div
                key={p.title}
                style={{
                  background: '#525353',
                  borderRadius: 20,
                  padding: '24px 20px',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(16px)',
                  transition: `opacity 400ms ease ${i * 80}ms, transform 400ms ease ${i * 80}ms`,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: C.lime,
                    marginBottom: 16,
                    boxShadow: `0 0 8px ${C.lime}60`,
                  }}
                />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#F4F7FA', marginBottom: 8 }}>{p.title}</div>
                <div style={{ fontSize: 13, color: '#CBD4DC', lineHeight: 1.6 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// Final CTA Section
// ─────────────────────────────────────────────────────────────────
function CtaSection() {
  const navigate = useNavigate();
  const { ref, visible } = useReveal();

  return (
    <section style={{ background: C.bg, padding: '120px 40px' }}>
      <div
        ref={ref}
        style={{
          maxWidth: 640,
          margin: '0 auto',
          textAlign: 'center',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 500ms ease, transform 500ms ease',
        }}
      >
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(28px, 4vw, 48px)',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: C.textPrimary,
            lineHeight: 1.1,
            marginBottom: 20,
          }}
        >
          Protect business payments<br />before they become incidents.
        </h2>
        <p style={{ fontSize: 15, color: C.textSecond, lineHeight: 1.6, marginBottom: 40 }}>
          Start screening vendor payments in minutes.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            id="cta-get-started"
            onClick={() => navigate('/sign-up')}
            style={{
              background: C.dark,
              color: '#F9FBFD',
              border: 'none',
              borderRadius: '9999px',
              padding: '14px 36px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 180ms ease, box-shadow 180ms ease',
              boxShadow: '0 4px 16px rgba(35,50,65,0.20)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 28px rgba(35,50,65,0.28)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(35,50,65,0.20)';
            }}
          >
            Get Started
          </button>
          <button
            id="cta-sign-in"
            onClick={() => navigate('/sign-in')}
            style={{
              background: 'rgba(35,50,65,0.08)',
              color: C.textPrimary,
              border: 'none',
              borderRadius: '9999px',
              padding: '14px 32px',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 180ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(35,50,65,0.13)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(35,50,65,0.08)')}
          >
            Sign In
          </button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer
      style={{
        background: C.dark,
        padding: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: '-0.03em',
            color: '#F4F7FA',
          }}
        >
          RocketGuard
        </span>
        <span style={{ fontSize: 12, color: '#9DB1BF', fontWeight: 500 }}>
          Built by Runtime Sync
        </span>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {[
          { label: 'How it works', href: '#how-it-works' },
          { label: 'Features',     href: '#features' },
          { label: 'Security',     href: '#security' },
        ].map(({ label, href }) => (
          <a
            key={label}
            href={href}
            style={{ fontSize: 13, color: '#CBD4DC', textDecoration: 'none', transition: 'color 180ms ease' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F4F7FA')}
            onMouseLeave={e => (e.currentTarget.style.color = '#CBD4DC')}
          >
            {label}
          </a>
        ))}
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)' }} />
        {[
          { label: 'Sign In',   to: '/sign-in' },
          { label: 'Sign Up',   to: '/sign-up' },
        ].map(({ label, to }) => (
          <Link
            key={label}
            to={to}
            style={{ fontSize: 13, color: '#CBD4DC', textDecoration: 'none', transition: 'color 180ms ease' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F4F7FA')}
            onMouseLeave={e => (e.currentTarget.style.color = '#CBD4DC')}
          >
            {label}
          </Link>
        ))}
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────
// Landing Page (assembled)
// ─────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', sans-serif" }}>
      <LandingHeader />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <SecuritySection />
      <CtaSection />
      <Footer />
    </div>
  );
}
