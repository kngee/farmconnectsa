const { getAuth } = require('firebase-admin/auth');
// Requiring firebaseService guarantees the Admin SDK app is initialized before getAuth()
const { db } = require('../services/firebaseService');

/**
 * Verifies a Firebase Auth ID token from the Authorization: Bearer header and
 * attaches { uid, email, role } to req.user. The role comes from users/{uid},
 * the same registry the frontend and Firestore rules use.
 */
async function verifyFirebaseToken(req, res, next) {
    const match = (req.headers.authorization || '').match(/^Bearer (.+)$/);
    if (!match) {
        return res.status(401).json({ error: 'Missing bearer token' });
    }

    try {
        const decoded = await getAuth().verifyIdToken(match[1]);
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        req.user = {
            uid: decoded.uid,
            email: decoded.email || null,
            role: userDoc.exists ? userDoc.data().role : null,
        };
        return next();
    } catch (error) {
        console.warn(`🚫 Rejected API call with invalid Firebase token (${error.code || error.message})`);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

/**
 * Gate a route to specific roles. Use AFTER verifyFirebaseToken.
 */
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (req.user?.role && allowedRoles.includes(req.user.role)) {
            return next();
        }
        return res.status(403).json({ error: 'Insufficient role' });
    };
}

module.exports = { verifyFirebaseToken, requireRole };
