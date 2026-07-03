import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.js';
import './FarmerProfiles.css';

// Helper function to format dates
const formatDate = (isoString) => {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Risk Status component
const RiskStatus = ({ status }) => {
  const statusConfig = {
    low: { label: 'Low Risk', icon: '🛡️', className: 'risk-status--low' },
    medium: { label: 'Medium Risk', icon: '⚠️', className: 'risk-status--medium' },
    high: { label: 'High Risk', icon: '🚨', className: 'risk-status--high' },
  };
  const config = statusConfig[status] || { label: 'Unknown', icon: '❓', className: 'risk-status--unknown' };
  
  return (
    <div className={`risk-status ${config.className}`}>
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

  const filteredProfiles = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return profiles;

    return profiles.filter(p => {
      const phone = p.phoneNumber || '';
      const town = p.location?.nearestTown?.toLowerCase() || '';
      const province = p.location?.province?.toLowerCase() || '';
      const summary = p.aiSummary?.toLowerCase() || '';
      return phone.includes(term) || town.includes(term) || province.includes(term) || summary.includes(term);
    });
  }, [profiles, searchTerm]);

  return (
    <main className="dashboard-main">
      <h1 className="dashboard-title">Farmer CRM</h1>
      <p className="dashboard-subtitle">
        Dynamically updated profiles based on farmer interactions.
      </p>
      
      <div className="search-container">
        <input 
          type="text" 
          placeholder="Search by phone, location, or summary..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading && <div className="dashboard-state">Loading profiles...</div>}
      {!loading && error && <div className="dashboard-state dashboard-state--error">{error}</div>}
      
      {!loading && !error && (
        <div className="profiles-grid">
          {filteredProfiles.length > 0 ? (
            filteredProfiles.map(profile => (
              <article key={profile.id} className="profile-card">
                <div className="profile-card__header">
                  <div>
                    <h3 className="profile-card__phone">{profile.phoneNumber}</h3>
                    <p className="profile-card__location">
                      {profile.location?.nearestTown || 'Unknown Location'}, {profile.location?.province}
                    </p>
                  </div>
                  <RiskStatus status={profile.riskStatus || 'low'} />
                </div>

                <div className="profile-card__summary">
                  <p>{profile.aiSummary || 'No AI summary available.'}</p>
                </div>

                <div className="profile-card__section">
                  <h4>Herd Composition</h4>
                  <div className="herd-grid">
                    {(profile.herd && profile.herd.length > 0) ? profile.herd.map(animal => (
                      <div key={animal.animalType} className="herd-item">
                        <span className="herd-item__count">{animal.count}</span>
                        <span className="herd-item__type">{animal.animalType}</span>
                      </div>
                    )) : <p className="text-muted">No herd data.</p>}
                  </div>
                </div>

                <div className="profile-card__section">
                  <h4>Ongoing Health Issues</h4>
                  <ul className="health-timeline">
                    {(profile.healthTimeline && profile.healthTimeline.filter(e=>e.status === 'ongoing').length > 0) ? 
                      profile.healthTimeline.filter(e => e.status === 'ongoing').map((event, index) => (
                        <li key={index}>
                          <span className={`severity-dot severity-dot--${event.severity}`}></span>
                          {event.event} ({event.relatedAnimal})
                        </li>
                      )) : <li className="text-muted">No ongoing health issues reported.</li>
                    }
                  </ul>
                </div>
                
                <div className="profile-card__footer">
                   Last Interaction: {formatDate(profile.lastInteraction)}
                </div>
              </article>
            ))
          ) : (
            <div className="dashboard-state">No profiles match your search.</div>
          )}
        </div>
      )}
    </main>
  );
}
