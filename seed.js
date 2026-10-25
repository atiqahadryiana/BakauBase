/**
 * Seed script for BakauBase.
 * 
 * Usage:
 *   1. Make sure you've set up your Firebase project and updated src/firebase.js config.
 *   2. Run: node seed.js
 * 
 * This script uses the Firebase client SDK to write seed data.
 * You need to be signed in or use a service account.
 * 
 * For simplicity, this script uses the Firebase Admin SDK.
 * Install it first: npm install firebase-admin
 * Set GOOGLE_APPLICATION_CREDENTIALS env var to your service account key file.
 * 
 * Alternatively, you can import the seed-data.json into Firestore manually
 * via the Firebase Console.
 */

import { readFileSync } from 'fs';

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  BakauBase Seed Data                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  To seed your Firestore database, you have two options:      ║
║                                                              ║
║  Option 1: Firebase Console (Recommended for beginners)      ║
║  ─────────────────────────────────────────────────────────    ║
║  1. Open Firebase Console > Firestore Database               ║
║  2. For each collection (sites, species, plots, stats),      ║
║     manually create documents using the data in              ║
║     seed-data.json.                                          ║
║                                                              ║
║  Option 2: Firebase Admin SDK                                ║
║  ─────────────────────────────────────────────────────────    ║
║  1. npm install firebase-admin                               ║
║  2. Download a service account key from                      ║
║     Firebase Console > Project Settings > Service Accounts   ║
║  3. Set environment variable:                                ║
║     GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json          ║
║  4. Uncomment the admin SDK code below and run:              ║
║     node seed.js                                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

// Load seed data
const seedData = JSON.parse(readFileSync('./seed-data.json', 'utf-8'));

console.log('Seed data summary:');
console.log(`  Sites: ${seedData.sites.length}`);
console.log(`  Species: ${seedData.species.length}`);
console.log(`  Plots: ${seedData.plots.length}`);
console.log(`  Observations: ${seedData.observations.length}`);
console.log('');

/*
// ========== UNCOMMENT THIS SECTION TO USE FIREBASE ADMIN SDK ==========

import admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

async function seed() {
  console.log('Seeding sites...');
  for (const site of seedData.sites) {
    const { id, ...data } = site;
    await db.doc(`sites/${id}`).set(data);
  }

  console.log('Seeding species...');
  for (const species of seedData.species) {
    const { id, ...data } = species;
    await db.doc(`species/${id}`).set(data);
  }

  console.log('Seeding plots...');
  for (const plot of seedData.plots) {
    const { id, ...data } = plot;
    data.plantedAt = admin.firestore.Timestamp.fromDate(new Date(data.plantedAt));
    data.createdAt = admin.firestore.Timestamp.now();
    await db.doc(`plots/${id}`).set(data);
  }

  console.log('Seeding observations...');
  for (const obs of seedData.observations) {
    const { plotId, id, ...data } = obs;
    data.date = admin.firestore.Timestamp.fromDate(new Date(data.date));
    data.createdAt = admin.firestore.Timestamp.now();
    await db.doc(`plots/${plotId}/observations/${id}`).set(data);
  }

  console.log('Seeding stats summary...');
  await db.doc('stats/summary').set({
    ...seedData.stats,
    updatedAt: admin.firestore.Timestamp.now()
  });

  console.log('\\n✅ Seed data written successfully!');
}

seed().catch(console.error);

// ========== END ADMIN SDK SECTION ==========
*/
