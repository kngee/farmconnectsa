import { useEffect, useMemo, useState } from 'react';
import {
  collection, onSnapshot, orderBy, query, where, limit,
  doc, updateDoc, serverTimestamp, getDocs,
} from 'firebase/firestore';
import { db } from '../../firebase.js';
import { apiFetch } from '../../services/api.js';
import CreateListingModal from './CreateListingModal.jsx';
import './Marketplace.css';

const ANIMAL_FILTERS = ['all', 'cattle', 'goats', 'sheep', 'pigs', 'poultry'];

function priceLabel(listing) {
  return typeof listing.askingPrice === 'number' && listing.askingPrice > 0
    ? `R ${listing.askingPrice.toLocaleString('en-ZA')}`
    : 'Price negotiable';
}

function locationLabel(listing) {
  const parts = [listing.location?.nearestTown, listing.location?.province].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Location not specified';
}

/**
 * Shared marketplace board rendered on every dashboard (farmer + staff).
 * Farmers additionally get "Sell My Livestock" and a My Listings manager.
 */
export default function MarketplaceBoard({ user, canSell = false, sellerProfile = null }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [animalFilter, setAnimalFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState('');
  const [interestBusy, setInterestBusy] = useState(null);
  const [interestsByListing, setInterestsByListing] = useState({});

  // Live board of active listings
  useEffect(() => {
    const q = query(
      collection(db, 'marketplace_listings'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Error loading marketplace listings:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const myListings = useMemo(
    () => listings.filter((l) => l.sellerUid === user?.uid),
    [listings, user]
  );

  const browseListings = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return listings.filter((l) => {
      if (animalFilter !== 'all' && (l.animalType || '').toLowerCase() !== animalFilter) return false;
      if (!term) return true;
      return [l.animalType, l.breed, l.notes, l.location?.nearestTown, l.location?.province]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [listings, animalFilter, searchTerm]);

  // Owners can read the interests subcollection on their own listings
  useEffect(() => {
    if (!canSell || myListings.length === 0) return;
    let cancelled = false;
    (async () => {
      const result = {};
      for (const listing of myListings) {
        try {
          const snap = await getDocs(collection(db, 'marketplace_listings', listing.id, 'interests'));
          result[listing.id] = snap.docs.map((d) => d.data());
        } catch {
          result[listing.id] = [];
        }
      }
      if (!cancelled) setInterestsByListing(result);
    })();
    return () => { cancelled = true; };
  }, [canSell, myListings]);

  const handleInterest = async (listingId) => {
    setInterestBusy(listingId);
    setToast('');
    try {
      const { notified } = await apiFetch(`/api/marketplace/listings/${listingId}/interest`, { method: 'POST' });
      setToast(notified
        ? '✅ The seller has been notified on WhatsApp.'
        : '✅ Your interest is recorded — the seller will see it on their dashboard.');
    } catch (err) {
      setToast(err.message || 'Could not record your interest.');
    } finally {
      setInterestBusy(null);
    }
  };

  const updateListingStatus = async (listingId, status) => {
    try {
      await updateDoc(doc(db, 'marketplace_listings', listingId), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating listing:', err);
    }
  };

  return (
    <section className="mp-panel">
      <div className="mp-panel__header-row">
        <div>
          <h2 className="mp-panel__title">🛒 Livestock Marketplace</h2>
          <p className="mp-panel__subtitle">
            Livestock listed for sale by FarmConnectSA farmers. Contact details stay
            private — sellers are notified when you express interest.
          </p>
        </div>
        {canSell && (
          <button className="mp-form__submit" onClick={() => setShowCreate(true)}>
            ＋ Sell My Livestock
          </button>
        )}
      </div>

      {toast && <div className="mp-banner mp-banner--info">{toast}</div>}

      {/* ── My Listings (sellers only) ── */}
      {canSell && myListings.length > 0 && (
        <>
          <h3 className="mp-panel__title" style={{ marginTop: '1.5rem' }}>My Listings</h3>
          <div className="mp-leads-grid">
            {myListings.map((l) => {
              const interests = interestsByListing[l.id] || [];
              return (
                <article key={l.id} className="mp-listing-card">
                  <h4 className="mp-listing-card__title">
                    {l.count} {l.animalType}{l.breed ? ` (${l.breed})` : ''}
                  </h4>
                  <span className="mp-listing-card__price">{priceLabel(l)}</span>
                  <span className="mp-listing-card__meta">📍 {locationLabel(l)}</span>
                  {interests.length > 0 ? (
                    <ul className="mp-interest-list">
                      {interests.map((i, idx) => (
                        <li key={idx}>Interested: {i.buyerRole} — {i.buyerEmail || 'no email'}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="mp-listing-card__meta">No interest yet.</span>
                  )}
                  <div className="mp-my-listing-actions">
                    <button onClick={() => updateListingStatus(l.id, 'sold')}>✔ Mark Sold</button>
                    <button onClick={() => updateListingStatus(l.id, 'withdrawn')}>✖ Withdraw</button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* ── Browse ── */}
      <div className="mp-board-toolbar" style={{ marginTop: '1.5rem' }}>
        <select className="mp-form__input" value={animalFilter} onChange={(e) => setAnimalFilter(e.target.value)}>
          {ANIMAL_FILTERS.map((f) => (
            <option key={f} value={f}>{f === 'all' ? 'All livestock' : f}</option>
          ))}
        </select>
        <input
          className="mp-form__input"
          style={{ flexGrow: 1, minWidth: '200px' }}
          type="text"
          placeholder="Search breed, town, province…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading && <div className="mp-state">Loading marketplace…</div>}

      {!loading && browseListings.length === 0 && (
        <div className="mp-state">
          No active listings match. {canSell ? 'Be the first — list your livestock above!' : 'Check back soon.'}
        </div>
      )}

      {!loading && browseListings.length > 0 && (
        <div className="mp-leads-grid">
          {browseListings.map((l) => (
            <article key={l.id} className="mp-listing-card">
              <h4 className="mp-listing-card__title">
                {l.count} {l.animalType}{l.breed ? ` (${l.breed})` : ''}
              </h4>
              <span className="mp-listing-card__price">{priceLabel(l)}</span>
              <span className="mp-listing-card__meta">📍 {locationLabel(l)}</span>
              {l.notes && <p className="mp-listing-card__notes">{l.notes}</p>}
              {l.sellerUid !== user?.uid && (
                <button
                  className="mp-listing-card__interest"
                  disabled={interestBusy === l.id}
                  onClick={() => handleInterest(l.id)}
                >
                  {interestBusy === l.id ? 'Sending…' : "🙋 I'm interested"}
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateListingModal
          user={user}
          defaultLocation={sellerProfile?.location || null}
          onClose={(created) => {
            setShowCreate(false);
            if (created) setToast('✅ Your listing is live!');
          }}
        />
      )}
    </section>
  );
}
