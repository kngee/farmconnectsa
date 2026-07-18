const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Credentials come from FIREBASE_SERVICE_KEY (Render) or the local
// gitignored serviceAccountKey.json (dev) — the file is never deployed.
const serviceAccount = process.env.FIREBASE_SERVICE_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_KEY)
    : require('../../../serviceAccountKey.json');

// Initialize Firebase with your credentials using the modular 'cert' function
initializeApp({
    credential: cert(serviceAccount)
});

// Initialize Firestore
const db = getFirestore();

console.log("Firebase Firestore connected successfully!");

module.exports = { db };