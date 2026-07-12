import { useState } from 'react'; // <-- Added useState
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase.js';
import TwilioConnectModal from '../../components/TwilioModal/TwilioConnectModal.jsx';
import './DashboardLayout.css';

export default function DashboardLayout({ user }) {
  const navigate = useNavigate();
  
  // State to control the Twilio Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  return (
    <div className="dashboard-layout">
      
      {/* ── Sidebar Navigation ── */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🌾</span>
          FarmConnectSA
        </div>
        
        <nav className="sidebar-nav">
          <p className="nav-heading">Platform</p>
          <NavLink to="/dashboard" end className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">💬</span> Chat Logs
          </NavLink>
          
          <NavLink to="/dashboard/profiles" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">👥</span> Farmer Profiles
          </NavLink>

          <p className="nav-heading">Services</p>
          <NavLink to="/dashboard/auctions" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">⚖️</span> Live Auctions
          </NavLink>
          
          <NavLink to="/dashboard/alerts" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">🚨</span> Health Alerts
          </NavLink>
        </nav>
      </aside>

      {/* ── Main Content Area (Dynamic) ── */}
      <div className="dashboard-main-area">
        <header className="dashboard-header">
          <div className="dashboard-header__left">
            <span className="role-badge">Super Admin</span>
          </div>
          
          <div className="dashboard-header__right">
            {/* New Connect Button */}
            <button 
              className="dashboard-header__connect" 
              onClick={() => setIsModalOpen(true)}
            >
              📱 Connect Bot
            </button>

            <span className="dashboard-header__email">{user?.email}</span>
            <button className="dashboard-header__signout" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>

        {/* The Outlet renders whatever tab is currently clicked */}
        <div className="dashboard-content-wrapper">
          <Outlet />
        </div>
      </div>
      
      {/* ── The Twilio Connect Modal ── */}
      <TwilioConnectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

    </div>
  );
}