import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Bell, Settings, User } from 'lucide-react';
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from './lib/api';
import Overview from './pages/Overview';
import Payments from './pages/Payments';
import Activity from './pages/Activity';
import Pipeline from './pages/Pipeline';
import { SignIn, SignUp } from './pages/Auth';
import Landing from './pages/Landing';
import './App.css';

// ─────────────────────────────────────────────────────────────────
// Auth Context
// ─────────────────────────────────────────────────────────────────
interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('rg_token');
    if (token) {
      api.getMe()
        .then(() => setIsAuthenticated(true))
        .catch(() => {
          localStorage.removeItem('rg_token');
          setIsAuthenticated(false);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string) => {
    localStorage.setItem('rg_token', token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('rg_token');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E4EBF5' }}>
        <div style={{ color: '#596168', fontFamily: "'Inter', sans-serif" }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// ─────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────
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

const NavPill = () => {
  const items = [
    { to: '/app',       label: 'Overview'     },
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
          className={({ isActive }) => `nav-pill-item${isActive ? ' active' : ''}`}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
};

const UtilityControls = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/sign-in');
  };

  return (
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
        onClick={handleLogout}
        title="Logout"
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
};

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

// ─────────────────────────────────────────────────────────────────
// Dashboard Layout (App Shell)
// ─────────────────────────────────────────────────────────────────
const DashboardLayout = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#E4EBF5' }}>
      <TopNav />
      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '40px 40px 60px' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="/app" element={<Overview />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/pipeline" element={<Pipeline />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}
