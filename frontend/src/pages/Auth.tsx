import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

// Design tokens
const C = {
  bg:         '#E4EBF5',
  surface:    '#F9FBFD',
  dark:       '#323232',
  lime:       '#DDF625',
  textPrimary:'#17191B',
  textSecond: '#596168',
  danger:     '#F04B4B',
};

// ─────────────────────────────────────────────────────────────────
// Auth Layout Shell
// ─────────────────────────────────────────────────────────────────
function AuthLayout({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ marginBottom: 40 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: '24px',
              letterSpacing: '-0.03em',
              color: C.textPrimary,
              lineHeight: 1,
            }}
          >
            RocketGuard
          </span>
        </Link>
      </div>

      <div
        style={{
          background: C.surface,
          borderRadius: 24,
          padding: '40px 48px',
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 8px 32px rgba(35,50,65,0.06)',
          border: '1px solid rgba(35,50,65,0.04)',
        }}
      >
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 28,
            fontWeight: 500,
            color: C.textPrimary,
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 14, color: C.textSecond, marginBottom: 32 }}>
          {subtitle}
        </p>

        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Auth Notice Banner
// ─────────────────────────────────────────────────────────────────
function AuthNotice() {
  return (
    <div
      style={{
        background: '#FFF5F5',
        border: `1px solid ${C.danger}30`,
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 24,
      }}
    >
      <AlertTriangle size={16} color={C.danger} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ fontSize: 13, color: '#A03030', lineHeight: 1.5 }}>
        <strong>Backend integration missing.</strong>
        <br />
        Real authentication endpoints do not exist in the backend yet. This is a UI-only preview.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Input Field
// ─────────────────────────────────────────────────────────────────
function Field({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textPrimary, marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="input-light"
        style={{ width: '100%' }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sign In Page
// ─────────────────────────────────────────────────────────────────
export function SignIn() {
  const navigate = useNavigate();

  return (
    <AuthLayout title="Sign In" subtitle="Welcome back to RocketGuard.">
      <AuthNotice />
      
      <Field label="Email address" type="email" placeholder="you@company.com" disabled />
      <Field label="Password" type="password" placeholder="••••••••" disabled />

      <button
        className="btn-primary"
        style={{ width: '100%', padding: '14px', fontSize: 14, marginTop: 12 }}
        onClick={() => navigate('/app')}
      >
        Preview Dashboard
      </button>

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: C.textSecond }}>
        Don't have an account?{' '}
        <Link to="/sign-up" style={{ color: C.textPrimary, fontWeight: 600, textDecoration: 'none' }}>
          Sign Up
        </Link>
      </div>
    </AuthLayout>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sign Up Page
// ─────────────────────────────────────────────────────────────────
export function SignUp() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const hasPassword = password.length > 0;
  const hasConfirm = confirmPassword.length > 0;
  const mismatch = hasPassword && hasConfirm && password !== confirmPassword;
  const canSubmit = hasPassword && hasConfirm && !mismatch;

  return (
    <AuthLayout title="Create Account" subtitle="Start screening payments in minutes.">
      <AuthNotice />
      
      <Field label="Full name" placeholder="Jane Doe" disabled />
      <Field label="Work email" type="email" placeholder="jane@company.com" disabled />
      <Field 
        label="Password" 
        type="password" 
        placeholder="••••••••" 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div style={{ marginBottom: mismatch ? 8 : 20 }}>
        <Field 
          label="Re-enter password" 
          type="password" 
          placeholder="Re-enter your password" 
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      
      {mismatch && (
        <div style={{ fontSize: 12, color: C.danger, marginBottom: 20, marginTop: -12 }}>
          Passwords do not match.
        </div>
      )}

      <button
        className="btn-primary"
        style={{ width: '100%', padding: '14px', fontSize: 14, marginTop: 4, opacity: canSubmit ? 1 : 0.6 }}
        onClick={() => {
          if (canSubmit) navigate('/app');
        }}
        disabled={!canSubmit}
      >
        Preview Dashboard
      </button>

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: C.textSecond }}>
        Already have an account?{' '}
        <Link to="/sign-in" style={{ color: C.textPrimary, fontWeight: 600, textDecoration: 'none' }}>
          Sign In
        </Link>
      </div>
    </AuthLayout>
  );
}
