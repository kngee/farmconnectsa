import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';

/*
  Drop your existing Firestore chat-log fetching logic here.
  The component receives the authenticated user as a prop.
*/
export default function Dashboard({ user }) {
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
    <div style={{
      minHeight: '100vh',
      background: '#F4F1E8',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Minimal header bar */}
      <header style={{
        background: '#0F2A1A',
        padding: '0 2rem',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: '1.1rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#E9A84C',
        }}>
          FarmConnectSA — Dashboard
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)' }}>
            {user?.email}
          </span>
          <button
            onClick={handleSignOut}
            style={{
              padding: '0.45rem 1rem',
              background: 'rgba(233,168,76,0.15)',
              color: '#E9A84C',
              border: '1px solid rgba(233,168,76,0.3)',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Content area — paste your chat log logic here */}
      <main style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
        <p style={{ color: '#6B6B5E', fontSize: '0.95rem' }}>
          Migrate your existing Firestore chat-log fetching logic into this component.
        </p>
      </main>
    </div>
  );
}