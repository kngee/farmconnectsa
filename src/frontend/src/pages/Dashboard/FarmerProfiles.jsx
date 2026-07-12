import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.js';
import './FarmerProfiles.css';

// Helper function to format dates
const formatDate = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Robust Location Renderer
const renderLocation = (loc) => {
  if (!loc || loc === 'unknown') return 'Location Unknown';
  if (typeof loc === 'string') return loc; 
  return [loc.nearestTown, loc.province].filter(Boolean).join(', ') || 'Location Unknown';
};

// Risk Status component
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


export default function FarmerProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'farmer_profiles'), orderBy('lastInteraction', 'desc'));
        const querySnapshot = await getDocs(q);
        const profilesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProfiles(profilesData);
      } catch (err) {
        console.error("Error fetching farmer profiles:", err);
        setError("Could not load farmer profiles. Please check your Firestore connection and security rules.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  // Upgraded Search: Now searches by Name and Email as well!
  const filteredProfiles = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return profiles;

    return profiles.filter(p => {
      const phone = p.phoneNumber?.toLowerCase() || '';
      const summary = p.aiSummary?.toLowerCase() || '';
      const language = p.preferredLanguage?.toLowerCase() || '';
      const locString = renderLocation(p.location).toLowerCase();
      const animals = p.herd?.map(a => a.animalType?.toLowerCase()).join(' ') || '';
      const name = p.name?.toLowerCase() || '';
      const email = p.email?.toLowerCase() || '';
      
      return phone.includes(term) || locString.includes(term) || summary.includes(term) || 
             language.includes(term) || animals.includes(term) || name.includes(term) || email.includes(term);
    });
  }, [profiles, searchTerm]);

  return (
    <main className="dashboard-main">
      <h1 className="dashboard-title">Farmer CRM</h1>
      <p className="dashboard-subtitle">
        Dynamically updated profiles automatically extracted from WhatsApp conversations.
      </p>
      
      <div className="search-container" style={{ marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Search by name, phone, email, location, or animals..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
          style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--c-border)' }}
        />
      </div>

      {loading && <div className="dashboard-state">Loading profiles...</div>}
      {!loading && error && <div className="dashboard-state dashboard-state--error">{error}</div>}
      
      {!loading && !error && (
        <div className="profiles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredProfiles.length > 0 ? (
            filteredProfiles.map(profile => (
              <article key={profile.id} className="profile-card" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--c-border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                
                {/* ── Header ── */}
                <div className="profile-card__header" style={{ padding: '1.25rem', borderBottom: '1px solid var(--c-border)', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flexGrow: 1, paddingRight: '1rem' }}>
                    
                    {/* Primary Identity: Use Name if available, fallback to Phone Number */}
                    <h3 className="profile-card__name" style={{ margin: '0 0 0.35rem 0', color: 'var(--c-dark)', fontSize: '1.1rem' }}>
                      🧑‍🌾 {profile.name || profile.phoneNumber}
                    </h3>
                    
                    {/* Contact & Demo Block */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>
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
                <div className="profile-card__summary" style={{ padding: '1.25rem', backgroundColor: 'rgba(233, 168, 76, 0.05)' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--c-dark)' }}>
                    <strong>🤖 Context:</strong> {profile.aiSummary || 'The AI is still gathering context on this farmer.'}
                  </p>
                </div>

                {/* ── Herd Details ── */}
                <div className="profile-card__section" style={{ padding: '1.25rem', borderBottom: '1px solid var(--c-border)' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--c-text-muted)' }}>Herd Composition</h4>
                  <div className="herd-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {(profile.herd && profile.herd.length > 0) ? profile.herd.map((animal, idx) => (
                      <div key={idx} className="herd-item" style={{ backgroundColor: '#f1f5f9', padding: '0.35rem 0.75rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--c-gold)', marginRight: '0.35rem' }}>{animal.count}</span>
                        {animal.animalType}
                      </div>
                    )) : <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>No herd data recorded.</p>}
                  </div>
                </div>

                {/* ── Health Issues ── */}
                <div className="profile-card__section" style={{ padding: '1.25rem', flexGrow: 1 }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--c-text-muted)' }}>Known Health Issues</h4>
                  <ul className="health-timeline" style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: 'var(--c-dark)' }}>
                    {(profile.healthTimeline && profile.healthTimeline.length > 0) ? (
                      profile.healthTimeline.map((event, index) => (
                        <li key={index} style={{ marginBottom: '0.35rem' }}>
                          <span style={{ color: event.status === 'resolved' ? 'green' : 'red' }}>
                            {event.event} {event.relatedAnimal ? `(${event.relatedAnimal})` : ''}
                          </span>
                        </li>
                      ))
                    ) : 
                    (profile.knownHealthIssues && profile.knownHealthIssues.length > 0) ? (
                      profile.knownHealthIssues.map((issue, index) => (
                        <li key={index} style={{ marginBottom: '0.35rem' }}>{issue}</li>
                      ))
                    ) : (
                      <li style={{ color: 'var(--c-text-muted)', listStyle: 'none', marginLeft: '-1.2rem' }}>No health issues reported.</li>
                    )}
                  </ul>
                </div>
                
                {/* ── Footer ── */}
                <div className="profile-card__footer" style={{ padding: '0.75rem 1.25rem', backgroundColor: '#f8f9fa', fontSize: '0.75rem', color: 'var(--c-text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--c-border)' }}>
                   <span><strong>Joined:</strong> {profile.profileCreatedAt ? formatDate(profile.profileCreatedAt) : '—'}</span>
                   <span><strong>Active:</strong> {formatDate(profile.lastInteraction)}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="dashboard-state" style={{ gridColumn: '1 / -1' }}>No profiles match your search.</div>
          )}
        </div>
      )}
    </main>
  );
}