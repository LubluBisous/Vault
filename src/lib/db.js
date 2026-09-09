// IndexedDB — stockage local sans limite pratique de taille.
// Tout reste sur l'appareil ; rien n'est synchronisé.

const DB_NAME = 'vault';
const DB_VERSION = 2;

let _dbPromise = null;

function openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('captures')) {
        db.createObjectStore('captures', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('knowledge')) {
        db.createObjectStore('knowledge', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(storeName, mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(storeName, mode);
        const store = t.objectStore(storeName);
        const result = fn(store);
        t.oncomplete = () => resolve(result?.result ?? result);
        t.onerror = () => reject(t.error);
      })
  );
}

export function saveCapture(capture) {
  return tx('captures', 'readwrite', (s) => s.put(capture));
}

export async function listCaptures() {
  const items = await tx('captures', 'readonly', (s) => s.getAll());
  return (items || []).sort((a, b) => a.createdAt - b.createdAt);
}

export async function listPendingCaptures() {
  const items = await listCaptures();
  return items.filter((c) => !c.analyzed);
}

export function deleteCapture(id) {
  return tx('captures', 'readwrite', (s) => s.delete(id));
}

export function clearCaptures() {
  return tx('captures', 'readwrite', (s) => s.clear());
}

export function getCapture(id) {
  return tx('captures', 'readonly', (s) => s.get(id));
}

// ── Base de connaissances ─────────────────────────

export function saveEntry(entry) {
  return tx('knowledge', 'readwrite', (s) => s.put(entry));
}

export async function listEntries() {
  const items = await tx('knowledge', 'readonly', (s) => s.getAll());
  return (items || []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteEntry(id) {
  return tx('knowledge', 'readwrite', (s) => s.delete(id));
}

// ── Métadonnées (structure de la documentation, etc.) ──

export function saveMeta(doc) {
  return tx('meta', 'readwrite', (s) => s.put(doc));
}

export function getMeta(id) {
  return tx('meta', 'readonly', (s) => s.get(id));
}
