import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import Footer from '../../components/Footer/Footer';

import './AuthPage.css';

/* Inline SVG for the Google 'G' logo — no external dependency */
function GoogleIcon() {
  return (
    <svg className="btn-google__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function AuthPage() {
  const navigate  = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err) {
      console.error('Google sign-in error:', err);
      // Friendly messages for the most common Firebase auth errors
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in window was closed. Please try again.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Check your connection and try again.');
      } else {
        setError('Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__grid" aria-hidden="true" />

      <div className="auth-card" role="main">
        {/* Brand */}
        <div className="auth-card__brand">
          <div className="auth-card__badge" aria-hidden="true">🌾</div>
          <span className="auth-card__name">FarmConnectSA</span>
        </div>

        {/* Heading */}
        <h1 className="auth-card__heading">Admin Access</h1>
        <p className="auth-card__subtext">
          Sign in with your authorised Google account to access the
          FarmConnectSA admin dashboard.
        </p>

        {/* Divider */}
        <div className="auth-divider" aria-hidden="true">
          <div className="auth-divider__line" />
          <span className="auth-divider__text">Continue with</span>
          <div className="auth-divider__line" />
        </div>

        {/* Google button / loading state */}
        {loading ? (
          <p className="auth-loading">Signing in…</p>
        ) : (
          <button
            className="btn-google"
            onClick={handleGoogleSignIn}
            disabled={loading}
            aria-label="Sign in with Google"
          >
            <GoogleIcon />
            Sign in with Google
          </button>
        )}

        {/* Error message */}
        {error && (
          <p className="auth-error" role="alert">{error}</p>
        )}

        {/* Back link */}
        <button className="auth-back" onClick={() => navigate('/')}>
          ← Back to home
        </button>
      </div>
    </div>
  );
}