import { useOutletContext } from 'react-router-dom';
import { formatDate, renderLocation } from '../../utils/profileDisplay.js';
import { WA_LINK } from '../../config.js';

// Risk Status component (matches the admin CRM styling)
const RiskStatus = ({ status }) => {
  const statusConfig = {
    low: { label: 'Low Risk', icon: '🛡️', className: 'risk-status--low' },
    medium: { label: 'Medium Risk', icon: '⚠️', className: 'risk-status--medium' },
    high: { label: 'High Risk', icon: '🚨', className: 'risk-status--high' },
  };
  const config = statusConfig[status?.toLowerCase()] || { label: 'Pending', icon: '⏳', className: 'risk-status--unknown' };

  return (
    <div className={`risk-status ${config.className}`} style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold' }}>
      {config.icon} {config.label}
    </div>
  );
};

export default function FarmerProfile() {
  const { user, loading, profile, error } = useOutletContext();

  if (loading) {
    return (
      <main className="dashboard-main">
        <div className="dashboard-state">Loading your profile…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-main">
        <div className="dashboard-state dashboard-state--error">{error}</div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="dashboard-main">
        <h1 className="dashboard-title">My Farm Profile</h1>
        <p className="dashboard-subtitle">Signed in as {user?.email}</p>
        <div className="farmer-empty">
          <div className="farmer-empty__icon" aria-hidden="true">🧑‍🌾</div>
          <h2 className="farmer-empty__heading">No profile yet</h2>
          <p className="farmer-empty__body">
            Your farm profile is built automatically from your conversations with our
            WhatsApp assistant. Chat to the bot and it will start capturing your herd,
            location, and health records for you.
          </p>
          <a className="btn-primary" href={WA_LINK} target="_blank" rel="noopener noreferrer">
            💬 Chat to our WhatsApp bot
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-main">
      <h1 className="dashboard-title">My Farm Profile</h1>
      <p className="dashboard-subtitle">
        Automatically updated from your WhatsApp conversations.
      </p>

      <article className="farmer-profile-card">
        {/* ── Header ── */}
        <div className="farmer-profile-card__header">
          <div>
            <h3 className="farmer-profile-card__name">
              🧑‍🌾 {profile.name || profile.phoneNumber}
            </h3>
            <div className="farmer-profile-card__meta">
              {profile.name && <span>📱 {profile.phoneNumber}</span>}
              {profile.email && <span>📧 {profile.email}</span>}
              <span>
                📍 {renderLocation(profile.location)}
                {profile.age ? ` • 🎂 ${profile.age} yrs` : ''}
              </span>
              <span>🗣️ {profile.preferredLanguage && profile.preferredLanguage !== 'unknown' ? profile.preferredLanguage : 'Language unknown'}</span>
            </div>
          </div>
          <RiskStatus status={profile.riskStatus || 'low'} />
        </div>

        {/* ── AI Summary ── */}
        <div className="farmer-profile-card__summary">
          <p>
            <strong>🤖 Context:</strong> {profile.aiSummary || 'The AI is still gathering context on your farm.'}
          </p>
        </div>

        {/* ── Herd Details ── */}
        <div className="farmer-profile-card__section">
          <h4>Herd Composition</h4>
          <div className="farmer-profile-card__herd">
            {(profile.herd && profile.herd.length > 0) ? profile.herd.map((animal, idx) => (
              <div key={idx} className="farmer-profile-card__chip">
                <span className="farmer-profile-card__chip-count">{animal.count}</span>
                {animal.animalType}
              </div>
            )) : <p className="farmer-profile-card__muted">No herd data recorded.</p>}
          </div>
        </div>

        {/* ── Health Issues ── */}
        <div className="farmer-profile-card__section">
          <h4>Health Timeline</h4>
          <ul className="farmer-profile-card__health">
            {(profile.healthTimeline && profile.healthTimeline.length > 0) ? (
              profile.healthTimeline.map((event, index) => (
                <li key={index} className={event.status === 'resolved' ? 'is-resolved' : 'is-active'}>
                  {event.event} {event.relatedAnimal ? `(${event.relatedAnimal})` : ''}
                </li>
              ))
            ) :
            (profile.knownHealthIssues && profile.knownHealthIssues.length > 0) ? (
              profile.knownHealthIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))
            ) : (
              <li className="farmer-profile-card__muted" style={{ listStyle: 'none' }}>No health issues reported.</li>
            )}
          </ul>
        </div>

        {/* ── Footer ── */}
        <div className="farmer-profile-card__footer">
          <span><strong>Joined:</strong> {profile.profileCreatedAt ? formatDate(profile.profileCreatedAt) : '—'}</span>
          <span><strong>Last active:</strong> {formatDate(profile.lastInteraction)}</span>
        </div>
      </article>
    </main>
  );
}
