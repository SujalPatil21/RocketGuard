import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../App';

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
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'LOGIN' | 'OTP'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const res = await api.login(email, password);
      if (res.data?.requires_otp) {
        setStep('OTP');
      } else if (res.data?.access_token) {
        login(res.data.access_token);
        navigate('/app');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const res = await api.verifyOtp(email, 'LOGIN', otp);
      if (res.data?.access_token) {
        login(res.data.access_token);
        navigate('/app');
      }
    } catch (err: any) {
      setError(err.message || 'OTP Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign In" subtitle="Welcome back to RocketGuard.">
      {error && (
        <div style={{ color: '#A03030', background: '#FFF5F5', border: '1px solid #F04B4B30', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}
      
      {step === 'LOGIN' ? (
        <form onSubmit={handleLogin}>
          <Field label="Email address" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
          <Field label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 14, marginTop: 12, opacity: (loading || !email || !password) ? 0.6 : 1 }}
            disabled={loading || !email || !password}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtp}>
          <Field label="Verification Code" type="text" placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} disabled={loading} />

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 14, marginTop: 12, opacity: (loading || !otp) ? 0.6 : 1 }}
            disabled={loading || !otp}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>
      )}

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
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'REGISTER' | 'OTP'>('REGISTER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasPassword = password.length > 0;
  const hasConfirm = confirmPassword.length > 0;
  const mismatch = hasPassword && hasConfirm && password !== confirmPassword;
  const canSubmit = fullName.length > 0 && email.length > 0 && hasPassword && hasConfirm && !mismatch;

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError('');
      await api.register(email, password, fullName);
      setStep('OTP');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async () => {
    try {
      setLoading(true);
      setError('');
      await api.verifyOtp(email, 'REGISTRATION', otp);
      navigate('/sign-in'); // Redirect to login after successful registration verification
    } catch (err: any) {
      setError(err.message || 'OTP Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create Account" subtitle="Start screening payments in minutes.">
      {error && (
        <div style={{ color: '#A03030', background: '#FFF5F5', border: '1px solid #F04B4B30', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}
      
      {step === 'REGISTER' ? (
        <>
          <Field label="Full name" placeholder="Jane Doe" value={fullName} onChange={e => setFullName(e.target.value)} disabled={loading} />
          <Field label="Work email" type="email" placeholder="jane@company.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
          <Field 
            label="Password" 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <div style={{ marginBottom: mismatch ? 8 : 20 }}>
            <Field 
              label="Re-enter password" 
              type="password" 
              placeholder="Re-enter your password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          
          {mismatch && (
            <div style={{ fontSize: 12, color: C.danger, marginBottom: 20, marginTop: -12 }}>
              Passwords do not match.
            </div>
          )}

          <button
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 14, marginTop: 4, opacity: canSubmit && !loading ? 1 : 0.6 }}
            onClick={handleRegister}
            disabled={!canSubmit || loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 14, color: C.textSecond, marginBottom: 20 }}>
            We've sent a verification code to <strong>{email}</strong>.
          </div>
          <Field label="Verification Code" type="text" placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} disabled={loading} />

          <button
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 14, marginTop: 12, opacity: (loading || !otp) ? 0.6 : 1 }}
            onClick={handleOtp}
            disabled={loading || !otp}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </>
      )}

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: C.textSecond }}>
        Already have an account?{' '}
        <Link to="/sign-in" style={{ color: C.textPrimary, fontWeight: 600, textDecoration: 'none' }}>
          Sign In
        </Link>
      </div>
    </AuthLayout>
  );
}
