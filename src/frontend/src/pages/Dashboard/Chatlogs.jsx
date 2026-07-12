import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, orderBy, query, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import './Dashboard.css';
export default function ChatLogs() {
  const [chatLogs, setChatLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [messageLimit, setMessageLimit] = useState(15); 
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch chat logs
        const logsQuery = query(collection(db, 'chat_logs'), orderBy('timestamp', 'desc'));
        const logsSnapshot = await getDocs(logsQuery);
        const logs = logsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setChatLogs(logs);

        // Fetch settings
        const settingsRef = doc(db, 'settings', 'global');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setMessageLimit(settingsSnap.data().messageLimit);
        } else {
          await setDoc(settingsRef, { messageLimit: 15 });
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Could not load data. Check connection and Firestore rules.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ── Database Save Function ──
  const saveLimitToDatabase = async (finalLimit) => {
    const settingsRef = doc(db, 'settings', 'global');
    try {
      await setDoc(settingsRef, { messageLimit: finalLimit }, { merge: true });
      setFeedback({ message: `Usage limit successfully saved to ${finalLimit}.`, type: 'success' });
      setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
    } catch (err) {
      console.error("Failed to update limit:", err);
      setFeedback({ 
        message: `Error: Could not save limit. Check Firestore security rules.`, 
        type: 'error' 
      });
    }
  };

  // Groups and counts (Kept exactly the same)
  const userUsageCounts = useMemo(() => {
    const counts = {};
    chatLogs.forEach(log => {
      if (log.phoneNumber) counts[log.phoneNumber] = (counts[log.phoneNumber] || 0) + 1;
    });
    return counts;
  }, [chatLogs]);

  const filteredAndGroupedLogs = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = chatLogs.filter(log => {
      const phone = (log.phoneNumber || '').toLowerCase();
      const userMsg = (log.userMessage || '').toLowerCase();
      const aiMsg = (log.aiResponse || '').toLowerCase();
      return phone.includes(term) || userMsg.includes(term) || aiMsg.includes(term);
    });

    const groups = {};
    filtered.forEach(log => {
      const phone = log.phoneNumber || 'Unknown';
      if (!groups[phone]) groups[phone] = [];
      groups[phone].push(log);
    });
    return groups;
  }, [chatLogs, searchTerm]);

  const checkSecurity = (message) => {
    if (!message) return [];
    const text = message.toLowerCase();
    const flags = [];
    const dangerousWords = ['poison', 'steal', 'hack', 'scam', 'illegal', 'weapon'];
    const vulgarWords = ['damn', 'crap', 'hell'];
    
    const containsExactWord = (wordList) => {
      return wordList.some(word => new RegExp(`\\b${word}\\b`, 'i').test(text));
    };
    
    if (containsExactWord(dangerousWords)) flags.push({ type: 'danger', label: '🚨 Security Risk' });
    if (containsExactWord(vulgarWords)) flags.push({ type: 'warning', label: '⚠️ Inappropriate' });
    return flags;
  };

  const lastActivity = chatLogs[0]?.timestamp ? formatTimestamp(chatLogs[0].timestamp) : '—';

  return (
    <main className="dashboard-main">
      <h1 className="dashboard-title">System Logs & Security</h1>
      <p className="dashboard-subtitle">
        Monitor interactions, flag dangerous content, and manage API usage limits.
      </p>

      <div className="config-panel">
        <div className="config-panel__header">
          <h3>⚙️ Global AI Usage Limits</h3>
          <span className="limit-badge">{messageLimit} msgs / user</span>
        </div>
        <p className="config-panel__desc">
          Adjust the slider to set the maximum allowed messages. It saves automatically when you let go.
        </p>
        <div className="slider-container">
          <span>1</span>
          <input 
            type="range" 
            min="1" 
            max="100" 
            value={messageLimit} 
            /* 1. Updates visual state smoothly as you drag */
            onChange={(e) => setMessageLimit(Number(e.target.value))}
            
            /* 2. Pushes to Database ONLY when you release the mouse/finger */
            onMouseUp={(e) => saveLimitToDatabase(Number(e.target.value))}
            onTouchEnd={(e) => saveLimitToDatabase(Number(e.target.value))}
            
            className="usage-slider"
          />
          <span>100</span>
        </div>
        
        {feedback.message && (
          <div className="dashboard-state" style={{ marginTop: '1rem', color: feedback.type === 'error' ? 'red' : 'green' }}>
            {feedback.message}
          </div>
        )}
      </div>

      {!loading && !error && (
        <div className="dashboard-stats">
          <div className="stat-card">
            <p className="stat-card__label">Total Interactions</p>
            <p className="stat-card__value">{chatLogs.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">Unique Farmers</p>
            <p className="stat-card__value">{Object.keys(userUsageCounts).length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">Last Activity</p>
            <p className="stat-card__value stat-card__value--sm">{lastActivity}</p>
          </div>
        </div>
      )}

      <div className="search-container">
        <input 
          type="text" 
          placeholder="Search by phone number, farmer message, or AI response..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <h2 className="dashboard-section-heading">Farmer Interaction Threads</h2>

      {loading && <div className="dashboard-state">Loading chat logs…</div>}
      {!loading && error && <div className="dashboard-state dashboard-state--error">{error}</div>}
      {!loading && !error && chatLogs.length === 0 && (
        <div className="dashboard-state">No farmer interactions yet.</div>
      )}

      {!loading && !error && Object.keys(filteredAndGroupedLogs).length > 0 && (
        <div className="logs-list">
          {Object.entries(filteredAndGroupedLogs).map(([phone, logs]) => {
            const usageCount = userUsageCounts[phone] || 0;
            const isOverLimit = usageCount >= messageLimit;
            const isNearingLimit = usageCount >= (messageLimit * 0.8) && !isOverLimit;

            return (
              <article className="farmer-group-card" key={phone}>
                <div className="farmer-group-header">
                  <div className="meta-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="log-card__phone">📱 {phone}</span>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                      ({logs.length} matched {logs.length === 1 ? 'message' : 'messages'})
                    </span>
                    
                    {isOverLimit && <span className="badge badge--danger">Over Usage Limit ({usageCount})</span>}
                    {isNearingLimit && <span className="badge badge--warning">High Usage ({usageCount})</span>}
                  </div>
                </div>

                <div className="farmer-group-messages">
                  {logs.map((log) => {
                    const securityFlags = checkSecurity(log.userMessage);

                    return (
                      <div className="message-thread-item" key={log.id}>
                        <div className="message-thread-meta">
                          <span className="log-card__time">{formatTimestamp(log.timestamp)}</span>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {securityFlags.map((flag, idx) => (
                              <span key={idx} className={`badge badge--${flag.type}`}>{flag.label}</span>
                            ))}
                          </div>
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
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
      
      {!loading && !error && chatLogs.length > 0 && Object.keys(filteredAndGroupedLogs).length === 0 && (
         <div className="dashboard-state">No interactions match your search term.</div>
      )}
    </main>
  );
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '—';
  let date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-ZA', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}