/**
 * Builds a podcast episode into ONE continuous audio track.
 *
 * Why not speak sentence by sentence at play time: that stalls between every
 * sentence, can't survive the screen locking, and re-spends quota on every
 * listen. Instead the episode is synthesized once — a handful of requests,
 * each covering several sentences — and the raw PCM is concatenated into a
 * single WAV. One `<audio>` element then plays it gaplessly, in the
 * background, with lockscreen controls.
 *
 * Sentence timing: each chunk's exact duration is known from its byte
 * length, so chunk boundaries are exact; within a chunk each sentence is
 * placed by character proportion. Because the estimate re-anchors at every
 * chunk boundary, drift never accumulates beyond a chunk.
 */

import { pcm16ToWavBlob } from '../lib/audio';
import { LANGUAGES } from '../lib/languages';
import type { PodcastEpisode } from '../lib/types';
import { synthesizeSpeechPcm, TtsError, type TtsErrorKind } from './tts';

/** Sentences are grouped up to these limits per TTS request. */
const CHUNK_CHAR_BUDGET = 700;
const CHUNK_MAX_LINES = 10;
/** Breathing room between chunks so the joins don't sound clipped. */
const GAP_MS = 250;
/**
 * Episodes whose audio is kept on the device. The shelf holds more than
 * this, so eviction is by least recently played rather than oldest built:
 * the ones actually being listened to are the ones that survive. Each
 * episode is roughly 10–15 MB of PCM, so this is tens of megabytes.
 */
const KEEP_EPISODES = 6;

const DB_NAME = 'daily-phrase-episode-audio';
const CHUNKS = 'chunks';
const TRACKS = 'tracks';

export interface EpisodeTimeline {
  /** Playback offset in seconds where each transcript line begins. */
  startSec: number[];
  durationSec: number;
}

interface TrackRecord {
  episodeId: string;
  timeline: EpisodeTimeline;
  sampleRate: number;
  chunkCount: number;
  builtAt: number;
  /** Touched every time the track is loaded, so eviction spares favourites. */
  playedAt?: number;
}

interface ChunkRecord {
  buffer: ArrayBuffer;
  sampleRate: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CHUNKS)) db.createObjectStore(CHUNKS);
        if (!db.objectStoreNames.contains(TRACKS)) db.createObjectStore(TRACKS);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB.'));
    });
  }
  return dbPromise;
}

function request<T>(store: IDBObjectStore, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const req = op(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed.'));
  });
}

async function withStore<T>(
  name: string,
  mode: IDBTransactionMode,
  body: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDb();
  const tx = db.transaction(name, mode);
  return body(tx.objectStore(name));
}

// ── Chunking ────────────────────────────────────────────────────────────────

interface Chunk {
  /** Indices of the transcript lines this chunk covers. */
  lineIndices: number[];
  text: string;
}

function chunkEpisode(episode: PodcastEpisode): Chunk[] {
  const chunks: Chunk[] = [];
  let current: number[] = [];
  let chars = 0;

  episode.lines.forEach((line, index) => {
    const length = line.de.length;
    if (current.length > 0 && (chars + length > CHUNK_CHAR_BUDGET || current.length >= CHUNK_MAX_LINES)) {
      chunks.push({ lineIndices: current, text: current.map((i) => episode.lines[i].de).join(' ') });
      current = [];
      chars = 0;
    }
    current.push(index);
    chars += length;
  });
  if (current.length > 0) {
    chunks.push({ lineIndices: current, text: current.map((i) => episode.lines[i].de).join(' ') });
  }
  return chunks;
}

// ── Build ───────────────────────────────────────────────────────────────────

export type BuildProgress = { done: number; total: number };

export class EpisodeAudioError extends Error {
  kind: TtsErrorKind;
  /** Chunks that were synthesized before failing — a retry resumes from here. */
  completed: number;
  constructor(kind: TtsErrorKind, message: string, completed: number) {
    super(message);
    this.kind = kind;
    this.completed = completed;
  }
}

export interface EpisodeAudio {
  blob: Blob;
  timeline: EpisodeTimeline;
}

function chunkKey(episodeId: string, index: number): string {
  return `${episodeId}:${index}`;
}

/** Concatenate chunk PCM and derive the per-sentence timeline. */
function assemble(
  episode: PodcastEpisode,
  chunks: Chunk[],
  pieces: Uint8Array[],
  sampleRate: number,
): EpisodeAudio {
  const bytesPerSecond = sampleRate * 2; // 16-bit mono
  // Keep the gap sample-aligned (2 bytes per sample) or the join clicks.
  const gapBytes = 2 * Math.round(((GAP_MS / 1000) * bytesPerSecond) / 2);
  const startSec = new Array<number>(episode.lines.length).fill(0);

  const audioBytes = pieces.reduce((sum, piece) => sum + piece.length, 0);
  const merged = new Uint8Array(audioBytes + gapBytes * Math.max(pieces.length - 1, 0));

  let offset = 0;
  pieces.forEach((piece, chunkIndex) => {
    const chunkStartSec = offset / bytesPerSecond;
    const chunkDurationSec = piece.length / bytesPerSecond;

    // Spread the chunk's sentences across its real duration by length.
    const indices = chunks[chunkIndex].lineIndices;
    const lengths = indices.map((i) => Math.max(episode.lines[i].de.length, 1));
    const totalChars = lengths.reduce((sum, n) => sum + n, 0);
    let charsSoFar = 0;
    indices.forEach((lineIndex, k) => {
      startSec[lineIndex] = chunkStartSec + (charsSoFar / totalChars) * chunkDurationSec;
      charsSoFar += lengths[k];
    });

    merged.set(piece, offset);
    offset += piece.length;
    // Silence between chunks (the array is already zero-filled).
    if (chunkIndex < pieces.length - 1) offset += gapBytes;
  });

  return {
    blob: pcm16ToWavBlob(merged, sampleRate),
    timeline: { startSec, durationSec: merged.length / bytesPerSecond },
  };
}

/** Episode ids that already have a complete stored track, for the shelf. */
export async function listBuiltEpisodeIds(): Promise<string[]> {
  const tracks = await withStore(TRACKS, 'readonly', (store) =>
    request<TrackRecord[]>(store, (s) => s.getAll()),
  ).catch(() => [] as TrackRecord[]);
  return tracks.map((track) => track.episodeId);
}

/** Cached audio for an episode, or null when it hasn't been built yet. */
export async function loadEpisodeAudio(episode: PodcastEpisode): Promise<EpisodeAudio | null> {
  const track = await withStore(TRACKS, 'readonly', (store) =>
    request<TrackRecord | undefined>(store, (s) => s.get(episode.id)),
  ).catch(() => undefined);
  if (!track) return null;

  const chunks = chunkEpisode(episode);
  if (chunks.length !== track.chunkCount) return null; // transcript changed

  const pieces: Uint8Array[] = [];
  for (let i = 0; i < track.chunkCount; i++) {
    const record = await withStore(CHUNKS, 'readonly', (store) =>
      request<ChunkRecord | undefined>(store, (s) => s.get(chunkKey(episode.id, i))),
    ).catch(() => undefined);
    if (!record) return null; // evicted or incomplete
    pieces.push(new Uint8Array(record.buffer));
  }

  // Mark it as in use so a later build evicts something else.
  await withStore(TRACKS, 'readwrite', (store) =>
    request(store, (s) => s.put({ ...track, playedAt: Date.now() }, episode.id)),
  ).catch(() => {});

  return assemble(episode, chunks, pieces, track.sampleRate);
}

/** Delete audio for the least recently played episodes beyond the limit. */
async function evictOldEpisodes(keepId: string): Promise<void> {
  const tracks = await withStore(TRACKS, 'readonly', (store) =>
    request<TrackRecord[]>(store, (s) => s.getAll()),
  ).catch(() => [] as TrackRecord[]);

  const stale = tracks
    .filter((track) => track.episodeId !== keepId)
    .sort((a, b) => (b.playedAt ?? b.builtAt) - (a.playedAt ?? a.builtAt))
    .slice(KEEP_EPISODES - 1);

  for (const track of stale) {
    for (let i = 0; i < track.chunkCount; i++) {
      await withStore(CHUNKS, 'readwrite', (store) =>
        request(store, (s) => s.delete(chunkKey(track.episodeId, i))),
      ).catch(() => {});
    }
    await withStore(TRACKS, 'readwrite', (store) =>
      request(store, (s) => s.delete(track.episodeId)),
    ).catch(() => {});
  }
}

/**
 * Synthesize the whole episode into one track, reusing any chunks already
 * stored — so a build interrupted by quota resumes instead of restarting.
 */
export async function buildEpisodeAudio(
  episode: PodcastEpisode,
  onProgress?: (progress: BuildProgress) => void,
  signal?: AbortSignal,
): Promise<EpisodeAudio> {
  const chunks = chunkEpisode(episode);
  const lang = LANGUAGES[episode.language].ttsLang;
  const pieces: Uint8Array[] = [];
  let sampleRate = 24000;

  for (let i = 0; i < chunks.length; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const cached = await withStore(CHUNKS, 'readonly', (store) =>
      request<ChunkRecord | undefined>(store, (s) => s.get(chunkKey(episode.id, i))),
    ).catch(() => undefined);

    if (cached) {
      pieces.push(new Uint8Array(cached.buffer));
      sampleRate = cached.sampleRate;
    } else {
      let speech;
      try {
        speech = await synthesizeSpeechPcm(chunks[i].text, lang, signal);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        const kind = err instanceof TtsError ? err.kind : 'other';
        const message = err instanceof Error ? err.message : 'Audio synthesis failed.';
        throw new EpisodeAudioError(kind, message, i);
      }
      pieces.push(speech.pcm);
      sampleRate = speech.sampleRate;
      // Store as we go: an interrupted build keeps everything already made.
      await withStore(CHUNKS, 'readwrite', (store) =>
        request(store, (s) =>
          s.put(
            { buffer: speech.pcm.buffer as ArrayBuffer, sampleRate: speech.sampleRate },
            chunkKey(episode.id, i),
          ),
        ),
      ).catch(() => {});
    }
    onProgress?.({ done: i + 1, total: chunks.length });
  }

  const audio = assemble(episode, chunks, pieces, sampleRate);
  await withStore(TRACKS, 'readwrite', (store) =>
    request(store, (s) =>
      s.put(
        {
          episodeId: episode.id,
          timeline: audio.timeline,
          sampleRate,
          chunkCount: chunks.length,
          builtAt: Date.now(),
        } satisfies TrackRecord,
        episode.id,
      ),
    ),
  ).catch(() => {});
  await evictOldEpisodes(episode.id).catch(() => {});

  return audio;
}

/** How many TTS requests a fresh build of this episode would take. */
export function chunkCountFor(episode: PodcastEpisode): number {
  return chunkEpisode(episode).length;
}
