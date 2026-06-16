import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase.js';
import Footer from '../../components/Footer/Footer';
import './Dashboard.css';

export default function Dashboard({ user }) {
  const navigate = useNavigate();

  const [chatLogs, setChatLogs] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const q = query(collection(db, 'chat_logs'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);

        const logs = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setChatLogs(logs);
      } catch (err) {
        console.error('Error fetching chat logs:', err);
        setError('Could not load chat logs. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  // Most recent interaction's timestamp, formatted for the "Last Activity" stat
  const lastActivity = chatLogs[0]?.timestamp
    ? formatTimestamp(chatLogs[0].timestamp)
    : '—';

  return (
    <div className="dashboard">
      {/* ── Header ──────────────────────────── */}
      <header className="dashboard-header">
        <span className="dashboard-header__brand">FarmConnectSA — Dashboard</span>
        <div className="dashboard-header__right">
          <span className="dashboard-header__email">{user?.email}</span>
          <button className="dashboard-header__signout" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────── */}
      <main className="dashboard-main">
        <h1 className="dashboard-title">Farmer Interactions</h1>
        <p className="dashboard-subtitle">
          Real-time log of WhatsApp queries and AI-generated responses.
        </p>

        {/* Stats bar — only meaningful once logs have loaded */}
        {!loading && !error && (
          <div className="dashboard-stats">
            <div className="stat-card">
              <p className="stat-card__label">Total Interactions</p>
              <p className="stat-card__value">{chatLogs.length}</p>
            </div>
            <div className="stat-card">
              <p className="stat-card__label">Unique Farmers</p>
              <p className="stat-card__value">{countUniquePhones(chatLogs)}</p>
            </div>
            <div className="stat-card">
              <p className="stat-card__label">Last Activity</p>
              <p className="stat-card__value stat-card__value--sm">{lastActivity}</p>
            </div>
          </div>
        )}

        <h2 className="dashboard-section-heading">Recent Farmer Queries</h2>

        {/* ── Loading state ────────────────── */}
        {loading && (
          <div className="dashboard-state">
            <div className="dashboard-state__spinner" aria-hidden="true" />
            Loading chat logs…
          </div>
        )}

        {/* ── Error state ──────────────────── */}
        {!loading && error && (
          <div className="dashboard-state dashboard-state--error" role="alert">
            {error}
          </div>
        )}

        {/* ── Empty state ──────────────────── */}
        {!loading && !error && chatLogs.length === 0 && (
          <div className="dashboard-state">
            No farmer interactions yet. Messages sent to the WhatsApp bot will appear here.
          </div>
        )}

        {/* ── Logs list ────────────────────── */}
        {!loading && !error && chatLogs.length > 0 && (
          <div className="logs-list">
            {chatLogs.map((log) => (
              <article className="log-card" key={log.id}>
                <div className="log-card__meta">
                  <span className="log-card__phone">📱 {log.phoneNumber || 'Unknown'}</span>
                  <span className="log-card__time">{formatTimestamp(log.timestamp)}</span>
                </div>
                <div className="log-card__body">
                  <div className="log-card__col">
                    <p className="log-card__col-label">💬 Farmer</p>
                    <p className="log-card__col-text">{log.userMessage || '—'}</p>
                  </div>
                  <div className="log-card__col log-card__col--ai">
                    <p className="log-card__col-label">🤖 AI Reply</p>
                    <p className="log-card__col-text">{log.aiResponse || '—'}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────── */

// Firestore timestamps come back as Firestore Timestamp objects (with .toDate())
// when written by firebase-admin, but can also be plain JS Dates/strings.
// Handle all three defensively.
function formatTimestamp(timestamp) {
  if (!timestamp) return '—';

  let date;
  if (typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-ZA', {
    day:    'numeric',
    month:  'short',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function countUniquePhones(logs) {
  const phones = new Set(logs.map((log) => log.phoneNumber).filter(Boolean));
  return phones.size;
}