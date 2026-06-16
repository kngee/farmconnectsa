import { useNavigate } from 'react-router-dom';
import './NavBar.css';

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar__brand">
        <div className="navbar__badge" aria-hidden="true">🌾</div>
        <span className="navbar__name">FarmConnectSA</span>
      </div>
      <button className="navbar__login" onClick={() => navigate('/auth')}>
        Admin Login
      </button>
    </nav>
  );
}