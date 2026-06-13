/**
 * Client-side persistence for completed analyses, backed by IndexedDB.
 *
 * A record has the shape:
 *   { id, createdAt, source, title, url, fileSize, summary }
 *
 * Uploaded video files themselves are never persisted — only the analysis
 * output, so history survives page reloads without storing large blobs.
 */

const DB_NAME = 'video-summarizer';
const DB_VERSION = 1;
const STORE = 'analyses';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const req = fn(store);
        tx.oncomplete = () => resolve(req && req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

/** Insert or update an analysis record. Returns the saved record. */
export async function saveAnalysis(record) {
  await withStore('readwrite', (store) => store.put(record));
  return record;
}

/** Return all analyses, newest first. */
export async function listAnalyses() {
  const all = await withStore('readonly', (store) => store.getAll());
  return (all || []).sort((a, b) => b.createdAt - a.createdAt);
}

/** Delete a single analysis by id. */
export async function deleteAnalysis(id) {
  return withStore('readwrite', (store) => store.delete(id));
}

/** Remove every saved analysis. */
export async function clearAnalyses() {
  return withStore('readwrite', (store) => store.clear());
}
