import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase.js';
import { ROLE_LABELS, canAccess } from '../../roles.js';
import TwilioConnectModal from '../../components/TwilioModal/TwilioConnectModal.jsx';
import './DashboardLayout.css';

// Sidebar sections; each item is gated by the tab access matrix in roles.js
const NAV = [
  {
    heading: 'Platform',
    items: [
      { tab: 'chatLogs', to: '/dashboard', end: true, icon: '💬', label: 'Chat Logs' },
      { tab: 'profiles', to: '/dashboard/profiles', icon: '👥', label: 'Farmer Profiles' },
    ],
  },
  {
    heading: 'Services',
    items: [
      { tab: 'alerts', to: '/dashboard/alerts', icon: '🚨', label: 'Health Alerts' },
      { tab: 'auctions', to: '/dashboard/auctions', icon: '⚖️', label: 'Auction Management' },
    ],
  },
  {
    heading: 'Admin',
    items: [
      { tab: 'users', to: '/dashboard/users', icon: '🛡️', label: 'User Management' },
    ],
  },
];

export default function DashboardLayout({ user, role }) {
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
          {NAV.map((section) => {
            const items = section.items.filter((item) => canAccess(role, item.tab));
            if (items.length === 0) return null;

            return (
              <div key={section.heading}>
                <p className="nav-heading">{section.heading}</p>
                {items.map((item) => (
                  <NavLink
                    key={item.tab}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                  >
                    <span className="nav-icon">{item.icon}</span> {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Main Content Area (Dynamic) ── */}
      <div className="dashboard-main-area">
        <header className="dashboard-header">
          <div className="dashboard-header__left">
            <span className="role-badge">{ROLE_LABELS[role] || role}</span>
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
          <Outlet context={{ user, role }} />
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
