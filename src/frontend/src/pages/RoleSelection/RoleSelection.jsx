import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase.js';
import './RoleSelection.css';

export default function RoleSelection() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  return (
    <div className="role-page">
      <div className="role-page__grid" aria-hidden="true" />

      <div className="role-card" role="main">
        {/* Brand */}
        <div className="role-card__brand">
          <div className="role-card__badge" aria-hidden="true">🌾</div>
          <span className="role-card__name">FarmConnectSA</span>
        </div>

        <h1 className="role-card__heading">Choose how to continue</h1>
        <p className="role-card__subtext">
          Your account has access to both views. Pick one — you can switch at any time.
        </p>

        <div className="role-card__options">
          <button className="role-option" onClick={() => navigate('/dashboard')}>
            <span className="role-option__icon" aria-hidden="true">🛡️</span>
            <span className="role-option__text">
              <span className="role-option__title">Admin</span>
              <span className="role-option__desc">Monitor the platform — chat logs, farmer CRM, and health alerts.</span>
            </span>
            <span className="role-option__arrow" aria-hidden="true">→</span>
          </button>

          <button className="role-option" onClick={() => navigate('/farmer-dashboard')}>
            <span className="role-option__icon" aria-hidden="true">🧑‍🌾</span>
            <span className="role-option__text">
              <span className="role-option__title">Farmer</span>
              <span className="role-option__desc">View your farm profile and browse the Auction Hub.</span>
            </span>
            <span className="role-option__arrow" aria-hidden="true">→</span>
          </button>
        </div>

        <button className="role-card__signout" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
