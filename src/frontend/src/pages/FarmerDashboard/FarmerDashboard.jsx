import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { auth, db } from '../../firebase.js';
import { ROLES } from '../../roles.js';
import './FarmerDashboard.css';
import '../Dashboard/Dashboard.css';

export default function FarmerDashboard({ user, role }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError]     = useState('');

  // Profiles are keyed by WhatsApp number (backend), so try uid → phone → email
  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        let snap = await getDoc(doc(db, 'farmer_profiles', user.uid));

        if (!snap.exists() && user.phoneNumber) {
          snap = await getDoc(doc(db, 'farmer_profiles', `whatsapp:${user.phoneNumber}`));
        }

        let found = snap.exists() ? { id: snap.id, ...snap.data() } : null;

        if (!found && user.email) {
          const qs = await getDocs(
            query(collection(db, 'farmer_profiles'), where('email', '==', user.email), limit(1))
          );
          if (!qs.empty) {
            found = { id: qs.docs[0].id, ...qs.docs[0].data() };
          }
        }

        if (!cancelled) setProfile(found);
      } catch (err) {
        console.error('Error fetching farmer profile:', err);
        if (!cancelled) setError('Could not load your profile. Please try again later.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();
    return () => { cancelled = true; };
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  return (
    <div className="farmer-dashboard">
      {/* ── Top Navigation ── */}
      <header className="farmer-nav">
        <div className="farmer-nav__brand">
          <span className="farmer-nav__badge" aria-hidden="true">🌾</span>
          FarmConnectSA
        </div>

        <nav className="farmer-nav__links" aria-label="Farmer dashboard navigation">
          <NavLink to="/farmer-dashboard" end className={({ isActive }) => isActive ? "farmer-nav__link active" : "farmer-nav__link"}>
            🧑‍🌾 My Profile
          </NavLink>
          <NavLink to="/farmer-dashboard/auctions" className={({ isActive }) => isActive ? "farmer-nav__link active" : "farmer-nav__link"}>
            ⚖️ Auction Hub
          </NavLink>
          <NavLink to="/farmer-dashboard/marketplace" className={({ isActive }) => isActive ? "farmer-nav__link active" : "farmer-nav__link"}>
            🛒 Marketplace
          </NavLink>
        </nav>

        <div className="farmer-nav__right">
          {role === ROLES.SUPER_ADMIN && (
            <button className="farmer-nav__switch" onClick={() => navigate('/select-role')}>
              Switch Role
            </button>
          )}
          <span className="farmer-nav__email">{user?.email}</span>
          <button className="farmer-nav__signout" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Active tab content ── */}
      <div className="farmer-dashboard__content">
        <Outlet context={{ user, loading, profile, error }} />
      </div>
    </div>
  );
}
