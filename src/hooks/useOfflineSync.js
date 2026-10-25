/**
 * Offline sync module.
 * Processes the IndexedDB queue and syncs items to Firebase.
 */
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { getPendingItems, getPhoto, dequeue, incrementRetry } from '../utils/offlineQueue';
import { estimateCarbon, getAgeYears } from '../utils/carbonEstimator';
import { getStatus } from '../config';
import { updateStats } from '../utils/statsUpdater';

export async function syncOfflineItems() {
  if (!navigator.onLine) return;

  const items = (await getPendingItems()).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'plot' ? -1 : 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
  console.log(`Syncing ${items.length} offline items...`);

  for (const item of items) {
    try {
      if (item.type === 'plot') {
        await syncPlot(item);
      } else if (item.type === 'observation') {
        await syncObservation(item);
      }
      await dequeue(item.clientId);
      window.dispatchEvent(new CustomEvent('bakaubase-queue-changed'));
      console.log(`Synced: ${item.clientId}`);
    } catch (error) {
      console.error(`Failed to sync ${item.clientId}:`, error);
      await incrementRetry(item.clientId);
    }
  }

  // Update stats after syncing
  if (items.length > 0) {
    await updateStats();
  }
}

async function syncPlot(item) {
  const { clientId, data } = item;
  let photoUrl = '';

  // Upload photo if available
  const photoBlob = await getPhoto(clientId);
  if (photoBlob) {
    const photoRef = ref(storage, `plots/${clientId}/photo.jpg`);
    await uploadBytes(photoRef, photoBlob);
    photoUrl = await getDownloadURL(photoRef);
  }

  // Create plot document using clientId as doc ID (prevents duplicates)
  await setDoc(doc(db, 'plots', clientId), {
    ...data,
    photoUrl,
    plantedAt: Timestamp.fromDate(new Date(data.plantedAt)),
    createdAt: Timestamp.now(),
  });
}

async function syncObservation(item) {
  const { clientId, data } = item;
  const { plotId, ...obsData } = data;
  let photoUrl = '';

  // Upload photo
  const photoBlob = await getPhoto(clientId);
  if (photoBlob) {
    const photoRef = ref(storage, `plots/${plotId}/observations/${clientId}/photo.jpg`);
    await uploadBytes(photoRef, photoBlob);
    photoUrl = await getDownloadURL(photoRef);
  }

  // Save observation
  await setDoc(doc(db, 'plots', plotId, 'observations', clientId), {
    ...obsData,
    photoUrl,
    date: Timestamp.fromDate(new Date(obsData.date)),
    createdAt: Timestamp.now(),
  });

  // Update plot survival and carbon
  const plotSnap = await getDoc(doc(db, 'plots', plotId));
  if (plotSnap.exists()) {
    const plot = plotSnap.data();
    const survivalRate = (obsData.aliveCount / plot.seedlingsPlanted) * 100;
    const status = getStatus(survivalRate);

    // Get species carbon factors
    let carbonLow = 0, carbonHigh = 0;
    if (plot.species) {
      const speciesSnap = await getDoc(doc(db, 'species', plot.species));
      if (speciesSnap.exists()) {
        const ageYears = getAgeYears(plot.plantedAt);
        const carbon = estimateCarbon(obsData.aliveCount, speciesSnap.data().carbonFactors, ageYears);
        carbonLow = carbon.co2eLow;
        carbonHigh = carbon.co2eHigh;
      }
    }

    await setDoc(doc(db, 'plots', plotId), {
      ...plot,
      survivalRate: Math.round(survivalRate),
      status,
      estimatedCarbonLow: carbonLow,
      estimatedCarbonHigh: carbonHigh,
    });
  }
}
