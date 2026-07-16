/**
 * IndexedDB cache for generated phrase illustrations. Separate database from
 * the recordings one so neither needs a version migration.
 */

const DB_NAME = 'daily-phrase-images';
const STORE = 'images';

interface StoredImage {
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

export const imageStorage = {
  async saveImage(phraseId: string, blob: Blob): Promise<void> {
    const record: StoredImage = { buffer: await blob.arrayBuffer(), mime: blob.type };
    await withStore('readwrite', (store) => store.put(record, phraseId));
  },

  async getImage(phraseId: string): Promise<Blob | null> {
    const record = await withStore<StoredImage | undefined>('readonly', (store) =>
      store.get(phraseId),
    );
    return record ? new Blob([record.buffer], { type: record.mime }) : null;
  },
};
