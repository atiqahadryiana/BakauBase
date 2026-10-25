import seed from '../../seed-data.json';
import { MALAYSIA_MANGROVES } from '../data/malaysiaMangroves.js';

const STORAGE_KEY = 'bakaubase-prototype-data-v4';

export class Timestamp {
  constructor(date) { this.date = new Date(date); }
  toDate() { return new Date(this.date); }
  toJSON() { return this.date.toISOString(); }
  static now() { return new Timestamp(new Date()); }
  static fromDate(date) { return new Timestamp(date); }
}

function initialData() {
  return {
    sites: Object.fromEntries(seed.sites.map(({ id, ...value }) => [id, value])),
    species: {
      ...Object.fromEntries(MALAYSIA_MANGROVES.map(({ id, ...value }) => [id, {
        ...value,
        carbonFactors: {},
        _note: 'TODO: Add cited species-specific carbon factors. No carbon value is assumed for this field-guide record.',
      }])),
      ...Object.fromEntries(seed.species.map(({ id, ...value }) => [id, value])),
    },
    plots: Object.fromEntries(seed.plots.map(({ id, ...value }) => [id, value])),
    observations: seed.observations.reduce((all, { plotId, id, ...value }) => {
      all[plotId] ||= {};
      all[plotId][id] = value;
      return all;
    }, {}),
    incidents: Object.fromEntries((seed.incidents || []).map(({ id, ...value }) => [id, value])),
    stats: { summary: seed.stats },
    users: {},
  };
}

function readStore() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialData();

    // Keep visitor-created records, but restore bundled demo collections when
    // an older deployment left an empty browser-local data shell behind.
    const parsed = JSON.parse(stored);
    const defaults = initialData();
    const populated = (value) => value && Object.keys(value).length > 0;
    const validSummary = parsed?.stats?.summary
      && (parsed.stats.summary.totalPlots || parsed.stats.summary.totalSeedlings || parsed.stats.summary.sites?.length);

    return {
      ...defaults,
      ...parsed,
      sites: populated(parsed.sites) ? parsed.sites : defaults.sites,
      species: populated(parsed.species) ? parsed.species : defaults.species,
      plots: populated(parsed.plots) ? parsed.plots : defaults.plots,
      observations: populated(parsed.observations) ? parsed.observations : defaults.observations,
      incidents: populated(parsed.incidents) ? parsed.incidents : defaults.incidents,
      stats: validSummary ? parsed.stats : defaults.stats,
      users: parsed.users || {},
    };
  } catch {
    return initialData();
  }
}

function writeStore(value) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch (error) {
    console.warn('Prototype data could not be persisted:', error);
  }
  window.dispatchEvent(new CustomEvent('bakaubase-data-changed'));
}

function hydrate(value, key = '') {
  if (value == null) return value;
  if (value instanceof Timestamp) return value;
  if (Array.isArray(value)) return value.map((item) => hydrate(item));
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, hydrate(child, childKey)]));
  if (typeof value === 'string' && ['plantedAt', 'date', 'createdAt', 'updatedAt'].includes(key)) return new Timestamp(value);
  return value;
}

function serialize(value) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, serialize(child)]));
  return value;
}

function reference(type, segments) { return { type, segments }; }
export function collection(_db, ...segments) { return reference('collection', segments); }
export function doc(_db, ...segments) { return reference('document', segments); }
export function orderBy(field, direction = 'asc') { return { field, direction }; }
export function query(ref, ...constraints) { return { ...ref, constraints }; }

class DocumentSnapshot {
  constructor(id, value) { this.id = id; this.value = value; }
  exists() { return this.value !== undefined; }
  data() { return hydrate(structuredClone(this.value)); }
}

function collectionValues(store, segments) {
  if (segments.length === 1) return store[segments[0]] || {};
  if (segments.length === 3 && segments[0] === 'plots' && segments[2] === 'observations') return store.observations[segments[1]] || {};
  return {};
}

function documentValue(store, segments) {
  if (segments.length === 2) return store[segments[0]]?.[segments[1]];
  if (segments.length === 4 && segments[0] === 'plots' && segments[2] === 'observations') return store.observations[segments[1]]?.[segments[3]];
  return undefined;
}

export async function getDocs(ref) {
  const store = readStore();
  let entries = Object.entries(collectionValues(store, ref.segments));
  const ordering = ref.constraints?.find((item) => item?.field);
  if (ordering) entries.sort(([, a], [, b]) => {
    const av = a[ordering.field] || '';
    const bv = b[ordering.field] || '';
    return String(av).localeCompare(String(bv)) * (ordering.direction === 'desc' ? -1 : 1);
  });
  return { docs: entries.map(([id, value]) => new DocumentSnapshot(id, value)), forEach(callback) { this.docs.forEach(callback); } };
}

export async function getDoc(ref) {
  return new DocumentSnapshot(ref.segments.at(-1), documentValue(readStore(), ref.segments));
}

function putDocument(store, segments, value, merge = false) {
  const serialized = serialize(value);
  if (segments.length === 2) {
    store[segments[0]] ||= {};
    store[segments[0]][segments[1]] = merge ? { ...(store[segments[0]][segments[1]] || {}), ...serialized } : serialized;
    return;
  }
  if (segments.length === 4 && segments[0] === 'plots' && segments[2] === 'observations') {
    store.observations[segments[1]] ||= {};
    store.observations[segments[1]][segments[3]] = merge ? { ...(store.observations[segments[1]][segments[3]] || {}), ...serialized } : serialized;
  }
}

export async function setDoc(ref, value, options = {}) {
  const store = readStore();
  putDocument(store, ref.segments, value, Boolean(options.merge));
  writeStore(store);
}

export async function updateDoc(ref, value) {
  const store = readStore();
  putDocument(store, ref.segments, value, true);
  writeStore(store);
}

export async function deleteDoc(ref) {
  const store = readStore();
  if (ref.segments.length === 2) delete store[ref.segments[0]]?.[ref.segments[1]];
  if (ref.segments.length === 4) delete store.observations[ref.segments[1]]?.[ref.segments[3]];
  writeStore(store);
}

export async function enableIndexedDbPersistence() { return undefined; }

export function resetPrototypeData() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('bakaubase-data-changed'));
}
