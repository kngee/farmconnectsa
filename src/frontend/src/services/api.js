import { auth } from '../firebase.js';

// Prefer an explicit VITE_API_BASE_URL. Otherwise, a PRODUCTION build defaults
// to the deployed backend (so it works even if the env var was never set), and
// only local dev falls back to localhost.
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://farmconnectsa.onrender.com' : 'http://localhost:3000');

/**
 * Authenticated fetch against the Express backend. Attaches the current user's
 * Firebase ID token as a Bearer header (the SDK refreshes tokens automatically).
 * Throws an Error with a `.status` property on non-2xx responses.
 */
export async function apiFetch(path, { method = 'GET', body } = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not signed in');
  }

  const token = await user.getIdToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}
