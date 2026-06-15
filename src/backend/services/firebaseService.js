const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Import your downloaded service account key
const serviceAccount = require('../../../serviceAccountKey.json');

// Initialize Firebase with your credentials using the modular 'cert' function
initializeApp({
    credential: cert(serviceAccount)
});

// Initialize Firestore
const db = getFirestore();

console.log("Firebase Firestore connected successfully!");

module.exports = { db };