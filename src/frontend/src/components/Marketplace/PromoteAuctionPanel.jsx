import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { apiFetch } from '../../services/api.js';
import './Marketplace.css';

const ANIMAL_TYPES = ['', 'cattle', 'goats', 'sheep', 'pigs', 'poultry'];

function formatAuctionOption(auction) {
  const date = auction.date?.toDate ? auction.date.toDate() : new Date(auction.date);
  const dateStr = Number.isNaN(date?.getTime())
    ? 'Date TBA'
    : date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', timeZone: 'Africa/Johannesburg' });
  return `${dateStr} — ${auction.title || 'Auction'} (${auction.location || 'TBA'})`;
}

export default function PromoteAuctionPanel() {
  const [auctions, setAuctions] = useState([]);
  const [auctionId, setAuctionId] = useState('');
  const [targetLocation, setTargetLocation] = useState('');
  const [targetAnimalType, setTargetAnimalType] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Upcoming auctions straight from Firestore (same pattern as AuctionHub)
  useEffect(() => {
    const q = query(
      collection(db, 'auction_schedules'),
      where('date', '>=', new Date()),
      orderBy('date', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setAuctions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Error loading auctions:', err);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auctionId || sending) return;
    setSending(true);
    setResult(null);
    setError('');
    try {
      const data = await apiFetch('/api/marketplace/broadcast', {
        method: 'POST',
        body: {
          auctionId,
          targetLocation: targetLocation.trim() || undefined,
          targetAnimalType: targetAnimalType || undefined,
        },
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Broadcast failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mp-panel">
      <h2 className="mp-panel__title">📢 Promote an Auction</h2>
      <p className="mp-panel__subtitle">
        Send a sponsored WhatsApp alert to consented farmers matching your target area and livestock.
        Only farmers who opted in (POPIA) are ever contacted.
      </p>

      <form className="mp-form" onSubmit={handleSubmit}>
        <label className="mp-form__label">
          Upcoming auction
          <select
            className="mp-form__input"
            value={auctionId}
            onChange={(e) => setAuctionId(e.target.value)}
            required
          >
            <option value="">Select an auction…</option>
            {auctions.map((a) => (
              <option key={a.id} value={a.id}>{formatAuctionOption(a)}</option>
            ))}
          </select>
        </label>

        <label className="mp-form__label">
          Target town / province (optional)
          <input
            className="mp-form__input"
            type="text"
            placeholder="e.g. Bloemfontein or Free State"
            value={targetLocation}
            onChange={(e) => setTargetLocation(e.target.value)}
          />
        </label>

        <label className="mp-form__label">
          Target livestock (optional)
          <select
            className="mp-form__input"
            value={targetAnimalType}
            onChange={(e) => setTargetAnimalType(e.target.value)}
          >
            {ANIMAL_TYPES.map((t) => (
              <option key={t || 'any'} value={t}>{t ? t : 'Any livestock'}</option>
            ))}
          </select>
        </label>

        <button className="mp-form__submit" type="submit" disabled={!auctionId || sending}>
          {sending ? 'Broadcasting…' : 'Send WhatsApp Promo Broadcast'}
        </button>
      </form>

      {result && (
        <div className="mp-banner mp-banner--success">
          Matched {result.matched} farmer{result.matched === 1 ? '' : 's'} · {result.sent} alert{result.sent === 1 ? '' : 's'} sent · {result.failed} failed
        </div>
      )}
      {error && <div className="mp-banner mp-banner--error">{error}</div>}

      <p className="mp-panel__note">
        ⚠️ Sandbox mode: alerts only reach farmers who chatted with the bot in the last 24 hours.
      </p>
    </section>
  );
}
