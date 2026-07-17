import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ADMIN_EMAIL } from '../config.js';
import { ROLES } from '../roles.js';

/**
 * Idempotent: fetches the users/{uid} doc, creating it on first login.
 * Returns the user's role. The platform owner is seeded as super_admin;
 * everyone else starts as a farmer and is promoted via User Management.
 */
export async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data().role || ROLES.FARMER;
  }

  const role = user.email === ADMIN_EMAIL ? ROLES.SUPER_ADMIN : ROLES.FARMER;
  await setDoc(ref, {
    email: user.email,
    displayName: user.displayName || '',
    role,
    createdAt: serverTimestamp(),
  });
  return role;
}
