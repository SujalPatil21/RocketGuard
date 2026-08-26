
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Overview from './pages/Overview';
import Payments from './pages/Payments';
import Activity from './pages/Activity';

const Nav = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="border-b border-border bg-surface px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2 text-primaryText font-semibold">
            <ShieldCheck className="w-5 h-5 text-primaryAccent" />
            <span>AP SENTINEL</span>
          </div>
          <div className="flex items-center space-x-6 text-sm text-secondaryText">
            <Link to="/" className={isActive('/') ? 'text-primaryText font-medium' : 'hover:text-primaryText'}>Overview</Link>
            <Link to="/payments" className={isActive('/payments') ? 'text-primaryText font-medium' : 'hover:text-primaryText'}>Payments</Link>
            <Link to="/activity" className={isActive('/activity') ? 'text-primaryText font-medium' : 'hover:text-primaryText'}>Activity</Link>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs text-secondaryText font-medium">
            <div className="w-2 h-2 rounded-full bg-safe"></div>
            <span>ROCKETRIDE CONNECTED</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Nav />
        <main className="flex-1 max-w-7xl w-full mx-auto p-6">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/activity" element={<Activity />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
