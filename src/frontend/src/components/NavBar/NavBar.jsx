import { useNavigate } from 'react-router-dom';
import './NavBar.css';

export default function Navbar({ links = [] }) {
  const navigate = useNavigate();

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar__brand">
        <div className="navbar__badge" aria-hidden="true">🌾</div>
        <span className="navbar__name">FarmConnectSA</span>
      </div>
      <div className="navbar__actions">
        {links.map((link) => (
          <button key={link.to} className="navbar__link" onClick={() => navigate(link.to)}>
            {link.label}
          </button>
        ))}
        <button className="navbar__login" onClick={() => navigate('/auth')}>
          Login
        </button>
      </div>
    </nav>
  );
}
