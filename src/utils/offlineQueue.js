/**
 * Offline queue manager using IndexedDB.
 * Saves plots and observations locally when offline,
 * syncs to Firebase when connection returns.
 * Uses client-generated UUIDs to prevent duplicates.
 */
import { openDB } from 'idb';

const DB_NAME = 'bakaubase-offline';
const DB_VERSION = 1;
const STORE_QUEUE = 'syncQueue';
const STORE_PHOTOS = 'photos';

/**
 * Open (or create) the IndexedDB database.
 */
async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'clientId' });
      }
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        db.createObjectStore(STORE_PHOTOS, { keyPath: 'clientId' });
      }
    },
  });
}

/**
 * Add an item to the sync queue.
 * @param {'plot'|'observation'} type - Type of record.
 * @param {string} clientId - Unique client-generated ID (UUID).
 * @param {object} data - The record data to sync.
 * @param {Blob|null} photoBlob - Compressed photo blob, if any.
 */
export async function enqueue(type, clientId, data, photoBlob = null) {
  const db = await getDb();
  await db.put(STORE_QUEUE, {
    clientId,
    type,
    data,
    createdAt: new Date().toISOString(),
    retries: 0,
  });
  if (photoBlob) {
    await db.put(STORE_PHOTOS, { clientId, blob: photoBlob });
  }
}

export function notifyQueueChanged() {
  window.dispatchEvent(new CustomEvent('bakaubase-queue-changed'));
}

/**
 * Get all items in the sync queue.
 */
export async function getPendingItems() {
  const db = await getDb();
  return db.getAll(STORE_QUEUE);
}

/**
 * Get the count of pending items.
 */
export async function getPendingCount() {
  const db = await getDb();
  return db.count(STORE_QUEUE);
}

/**
 * Get a photo blob for a given clientId.
 */
export async function getPhoto(clientId) {
  const db = await getDb();
  const record = await db.get(STORE_PHOTOS, clientId);
  return record?.blob || null;
}

/**
 * Remove an item from the queue after successful sync.
 */
export async function dequeue(clientId) {
  const db = await getDb();
  await db.delete(STORE_QUEUE, clientId);
  await db.delete(STORE_PHOTOS, clientId).catch(() => {});
}

/**
 * Increment retry count for a failed item.
 */
export async function incrementRetry(clientId) {
  const db = await getDb();
  const item = await db.get(STORE_QUEUE, clientId);
  if (item) {
    item.retries += 1;
    await db.put(STORE_QUEUE, item);
  }
}

/**
 * Clear the entire queue (use with caution).
 */
export async function clearQueue() {
  const db = await getDb();
  await db.clear(STORE_QUEUE);
  await db.clear(STORE_PHOTOS);
}
