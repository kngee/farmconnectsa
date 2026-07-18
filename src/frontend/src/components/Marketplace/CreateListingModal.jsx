import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase.js';
import './Marketplace.css';

const ANIMAL_TYPES = ['cattle', 'goats', 'sheep', 'pigs', 'poultry', 'other'];

/**
 * Farmer-facing "Sell My Livestock" form. Writes directly to Firestore —
 * security rules enforce sellerUid ownership and forbid contact-info fields.
 */
export default function CreateListingModal({ user, defaultLocation, onClose }) {
  const [animalType, setAnimalType] = useState('cattle');
  const [count, setCount] = useState('');
  const [breed, setBreed] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [nearestTown, setNearestTown] = useState(defaultLocation?.nearestTown || '');
  const [province, setProvince] = useState(defaultLocation?.province || '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedCount = parseInt(count, 10);
    if (!parsedCount || parsedCount < 1) {
      setError('Please enter how many animals you are selling.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await addDoc(collection(db, 'marketplace_listings'), {
        sellerUid: user.uid,
        animalType,
        count: parsedCount,
        breed: breed.trim() || null,
        askingPrice: askingPrice ? parseFloat(askingPrice) : null,
        location: {
          nearestTown: nearestTown.trim() || null,
          province: province.trim() || null,
        },
        notes: notes.trim().slice(0, 300),
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onClose(true);
    } catch (err) {
      console.error('Error creating listing:', err);
      setError('Could not create your listing. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="mp-modal-backdrop" onClick={() => onClose(false)}>
      <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="mp-modal__title">🐄 Sell My Livestock</h2>

        <form className="mp-form" onSubmit={handleSubmit}>
          <label className="mp-form__label">
            Animal type
            <select className="mp-form__input" value={animalType} onChange={(e) => setAnimalType(e.target.value)}>
              {ANIMAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label className="mp-form__label">
            How many
            <input className="mp-form__input" type="number" min="1" value={count}
              onChange={(e) => setCount(e.target.value)} required placeholder="e.g. 5" />
          </label>

          <label className="mp-form__label">
            Breed (optional)
            <input className="mp-form__input" type="text" value={breed}
              onChange={(e) => setBreed(e.target.value)} placeholder="e.g. Nguni" />
          </label>

          <label className="mp-form__label">
            Asking price in Rand (optional)
            <input className="mp-form__input" type="number" min="0" step="any" value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)} placeholder="Leave empty for negotiable" />
          </label>

          <label className="mp-form__label">
            Nearest town
            <input className="mp-form__input" type="text" value={nearestTown}
              onChange={(e) => setNearestTown(e.target.value)} placeholder="e.g. Jozini" />
          </label>

          <label className="mp-form__label">
            Province
            <input className="mp-form__input" type="text" value={province}
              onChange={(e) => setProvince(e.target.value)} placeholder="e.g. KwaZulu-Natal" />
          </label>

          <label className="mp-form__label mp-form__label--full">
            Notes (optional, max 300 characters)
            <textarea className="mp-form__input" rows="3" maxLength="300" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condition, vaccinations, reason for selling…" />
          </label>

          {error && <div className="mp-banner mp-banner--error mp-form__label--full">{error}</div>}

          <div className="mp-modal__actions mp-form__label--full">
            <button type="button" className="mp-modal__cancel" onClick={() => onClose(false)}>Cancel</button>
            <button type="submit" className="mp-form__submit" disabled={saving}>
              {saving ? 'Publishing…' : 'Publish Listing'}
            </button>
          </div>
        </form>

        <p className="mp-panel__note">
          🔒 Your phone number is never shown. Interested buyers reach you through
          FarmConnectSA, and you choose whether to respond.
        </p>
      </div>
    </div>
  );
}
