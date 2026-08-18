/**
 * IndexedDB store for AI-written podcast episodes. Each one costs a
 * text-model call, so an episode is written once and then kept for good —
 * it becomes a permanent item on the learner's shelf.
 *
 * Separate database from recordings/images so none of them needs a version
 * migration when another changes.
 */

import type { PodcastEpisode } from '../lib/types';

const DB_NAME = 'daily-phrase-episodes';
const STORE = 'episodes';

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

export const episodeStorage = {
  async save(episode: PodcastEpisode): Promise<void> {
    await withStore('readwrite', (store) => store.put(episode, episode.id));
  },

  async get(id: string): Promise<PodcastEpisode | null> {
    const episode = await withStore<PodcastEpisode | undefined>('readonly', (store) =>
      store.get(id),
    );
    return episode ?? null;
  },

  /** Every written episode, for building the shelf. Newest first. */
  async list(): Promise<PodcastEpisode[]> {
    const all = await withStore<PodcastEpisode[]>('readonly', (store) => store.getAll());
    return all
      // Episodes cached by an earlier version were keyed by date and have no
      // createdISO; they are not shelf items, so leave them out.
      .filter((episode) => typeof episode?.createdISO === 'string')
      .sort((a, b) => (b.createdISO ?? '').localeCompare(a.createdISO ?? ''));
  },

  async remove(id: string): Promise<void> {
    await withStore('readwrite', (store) => store.delete(id));
  },
};
