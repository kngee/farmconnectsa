const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Parse the service account from the environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY);

// Initialize Firebase with your credentials using the modular 'cert' function
initializeApp({
    credential: cert(serviceAccount)
});

// Initialize Firestore
const db = getFirestore();

console.log("Firebase Firestore connected successfully!");

module.exports = { db };