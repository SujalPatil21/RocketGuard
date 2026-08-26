import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Bell, Settings, User } from 'lucide-react';
import Overview from './pages/Overview';
import Payments from './pages/Payments';
import Activity from './pages/Activity';
import Pipeline from './pages/Pipeline';
import './App.css';

// Clean text wordmark — no icon
const Brand = () => (
  <span
    style={{
      fontFamily: "'Space Grotesk', sans-serif",
      fontWeight: 700,
      fontSize: '22px',
      letterSpacing: '-0.03em',
      color: '#17191B',
      lineHeight: 1,
    }}
  >
    RocketGuard
  </span>
);

// Horizontal navigation pill
const NavPill = () => {
  const items = [
    { to: '/',          label: 'Overview'     },
    { to: '/payments',  label: 'Payments'     },
    { to: '/activity',  label: 'Activity'     },
    { to: '/pipeline',  label: 'Pipeline'     },
  ];

  return (
    <nav className="nav-pill">
      {items.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `nav-pill-item${isActive ? ' active' : ''}`}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
};

// Top utility controls
const UtilityControls = () => (
  <div className="flex items-center gap-2">
    <button
      id="nav-notifications"
      aria-label="Notifications"
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: '#F9FBFD',
        border: '1px solid rgba(35,50,65,0.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 180ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#EEF3FA')}
      onMouseLeave={e => (e.currentTarget.style.background = '#F9FBFD')}
    >
      <Bell size={15} color="#596168" />
    </button>
    <button
      id="nav-settings"
      aria-label="Settings"
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: '#F9FBFD',
        border: '1px solid rgba(35,50,65,0.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 180ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#EEF3FA')}
      onMouseLeave={e => (e.currentTarget.style.background = '#F9FBFD')}
    >
      <Settings size={15} color="#596168" />
    </button>
    <button
      id="nav-profile"
      aria-label="Profile"
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: '#323232',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 180ms ease',
      }}
    >
      <User size={15} color="#C9CED3" />
    </button>
  </div>
);

// Top navigation bar
const TopNav = () => (
  <header
    style={{
      background: '#E4EBF5',
      borderBottom: '1px solid rgba(35, 50, 65, 0.08)',
      padding: '12px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}
  >
    <Brand />
    <NavPill />
    <UtilityControls />
  </header>
);

import { SignIn, SignUp } from './pages/Auth';
import Landing from './pages/Landing';

// ─────────────────────────────────────────────────────────────────
// Dashboard Layout (App Shell)
// ─────────────────────────────────────────────────────────────────
const DashboardLayout = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#E4EBF5' }}>
      <TopNav />
      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '40px 40px 60px' }}>
        <Routes>
          <Route path="/"         element={<Overview />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/pipeline" element={<Pipeline />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/app/*" element={<DashboardLayout />} />
      </Routes>
    </Router>
  );
}
