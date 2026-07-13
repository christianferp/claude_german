/**
 * IndexedDB storage for the user's pronunciation recordings.
 *
 * Blobs can't live in localStorage, so recording audio goes here while all
 * JSON metadata stays in the Zustand persist store. Recordings are stored as
 * { buffer, mime } instead of raw Blobs — ArrayBuffers survive structured
 * clone reliably everywhere (raw Blob storage has a history of breaking in
 * Safari/WebKit), and it keeps the mime type explicit for playback.
 */

const DB_NAME = 'daily-phrase-audio';
const STORE = 'recordings';

interface StoredRecording {
  buffer: ArrayBuffer;
  mime: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB.'));
    });
  }
  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = operation(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

export const audioStorage = {
  /** put() overwrites, so re-recording a phrase replaces the old take. */
  async saveRecording(phraseId: string, blob: Blob): Promise<void> {
    const record: StoredRecording = { buffer: await blob.arrayBuffer(), mime: blob.type };
    await withStore('readwrite', (store) => store.put(record, phraseId));
  },

  async getRecording(phraseId: string): Promise<Blob | null> {
    const record = await withStore<StoredRecording | undefined>('readonly', (store) =>
      store.get(phraseId),
    );
    return record ? new Blob([record.buffer], { type: record.mime }) : null;
  },

  async deleteRecording(phraseId: string): Promise<void> {
    await withStore('readwrite', (store) => store.delete(phraseId));
  },

  async clear(): Promise<void> {
    await withStore('readwrite', (store) => store.clear());
  },
};
