import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../services/api.js';
import './Marketplace.css';

function describeIntent(intent) {
  const count = intent.count ?? 'some';
  const urgency = intent.timeframe === 'immediate' ? 'immediate' : 'future';
  return `intends to sell ${count} ${intent.animalType} (${urgency})`;
}

export default function LeadsPanel() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/marketplace/leads');
      setLeads(data.leads || []);
    } catch (err) {
      setError(err.message || 'Could not load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handlePurchase = async (leadId) => {
    setToast('');
    try {
      await apiFetch(`/api/marketplace/leads/${leadId}/purchase`, { method: 'POST' });
    } catch (err) {
      if (err.status === 501) {
        setToast('💳 Lead purchasing launches soon — this lead has been noted for you.');
      } else {
        setToast(err.message || 'Could not request this lead.');
      }
    }
  };

  return (
    <section className="mp-panel">
      <div className="mp-panel__header-row">
        <div>
          <h2 className="mp-panel__title">🎯 Marketplace Leads</h2>
          <p className="mp-panel__subtitle">
            Farmers who consented to buyer alerts and told our assistant they want to sell.
            Identities stay masked until a lead is purchased (POPIA).
          </p>
        </div>
        <button className="mp-refresh" onClick={fetchLeads} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {loading && (
        <div className="mp-state">
          Loading leads… (first load can take up to a minute while the server wakes up)
        </div>
      )}
      {!loading && error && <div className="mp-banner mp-banner--error">{error}</div>}
      {toast && <div className="mp-banner mp-banner--info">{toast}</div>}

      {!loading && !error && leads.length === 0 && (
        <div className="mp-state">
          No sale leads yet. Leads appear when farmers consent to sharing and mention wanting to sell.
        </div>
      )}

      {!loading && !error && leads.length > 0 && (
        <div className="mp-leads-grid">
          {leads.map((lead) => (
            <article key={lead.leadId} className="mp-lead-card">
              <h3 className="mp-lead-card__title">
                🧑‍🌾 Farmer near {lead.location?.nearestTown || lead.location?.province || 'unknown area'}
              </h3>
              <ul className="mp-lead-card__intents">
                {lead.salesIntent.map((intent, i) => (
                  <li key={i}>{describeIntent(intent)}</li>
                ))}
              </ul>
              {lead.herdSummary?.length > 0 && (
                <p className="mp-lead-card__herd">
                  Herd: {lead.herdSummary.map((h) => `${h.count ?? '?'} ${h.animalType}`).join(', ')}
                </p>
              )}
              {lead.lastActive && (
                <p className="mp-lead-card__meta">Active {lead.lastActive}</p>
              )}
              <button className="mp-lead-card__buy" onClick={() => handlePurchase(lead.leadId)}>
                Purchase Lead / Contact
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
