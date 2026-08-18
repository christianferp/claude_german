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

interface ChunkLimits {
  charBudget: number;
  maxLines: number;
}

/**
 * Sentences are grouped up to these limits per TTS request. Bigger chunks
 * mean fewer seams between separately-synthesized pieces, which is most of
 * what made early episodes sound like a row of separate recordings rather
 * than one narration (see the continuation prompting in tts.ts for the
 * rest). Episodes already recorded under the old, smaller limits keep
 * playing under `LEGACY_CHUNK_LIMITS` — see `loadEpisodeAudio` — so this
 * only affects new recordings, never a re-record of something you already
 * have.
 */
const CHUNK_LIMITS: ChunkLimits = { charBudget: 1400, maxLines: 18 };
const LEGACY_CHUNK_LIMITS: ChunkLimits = { charBudget: 700, maxLines: 10 };

/**
 * Breathing room between chunks so the joins don't sound abrupt — a small
 * natural gap, not a stop. Most of the old dead air at each seam was the
 * model's own leading/trailing silence on every request, which is trimmed
 * separately in `assemble`; this is only the deliberate join itself.
 */
const GAP_MS = 90;
/**
 * Samples at or below this amplitude (out of a 16-bit signed range) count as
 * silence when trimming the ends of a chunk. Low enough to leave real quiet
 * speech alone, high enough to catch encoder noise floor.
 */
const SILENCE_AMPLITUDE = 400;
/** A sliver of quiet is kept at each trimmed edge so a cut doesn't click. */
const TRIM_MARGIN_MS = 40;
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
  /**
   * Which transcript lines went into each chunk, so a track built under one
   * set of chunking limits keeps matching after those limits change.
   * Absent on tracks written before this field existed — those fall back to
   * `LEGACY_CHUNK_LIMITS`, which is what they were actually built with.
   */
  lineIndices?: number[][];
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

function chunkEpisode(episode: PodcastEpisode, limits: ChunkLimits = CHUNK_LIMITS): Chunk[] {
  const chunks: Chunk[] = [];
  let current: number[] = [];
  let chars = 0;

  episode.lines.forEach((line, index) => {
    const length = line.de.length;
    if (
      current.length > 0 &&
      (chars + length > limits.charBudget || current.length >= limits.maxLines)
    ) {
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

/** Rebuild a `Chunk[]` from a stored layout, so old tracks keep matching even after the limits above change. */
function chunksFromLayout(episode: PodcastEpisode, lineIndices: number[][]): Chunk[] {
  return lineIndices.map((indices) => ({
    lineIndices: indices,
    text: indices.map((i) => episode.lines[i].de).join(' '),
  }));
}

/**
 * Index of the first sample whose amplitude exceeds the silence threshold,
 * scanning from `start` toward `end` in the given direction.
 */
function findSoundEdge(pcm: Uint8Array, start: number, end: number, step: number): number {
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  for (let byteOffset = start; step > 0 ? byteOffset < end : byteOffset > end; byteOffset += step) {
    if (Math.abs(view.getInt16(byteOffset, true)) > SILENCE_AMPLITUDE) return byteOffset;
  }
  return start;
}

/**
 * Trims near-silence from both ends of one chunk's PCM. This is what the
 * model itself adds to the start and end of every request — stacked across
 * many chunks it was the bulk of the "separate recordings" effect, well
 * beyond the deliberate join gap.
 */
function trimSilence(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const bytesPerSample = 2;
  const marginBytes =
    bytesPerSample * Math.round(((TRIM_MARGIN_MS / 1000) * sampleRate));
  const soundStart = findSoundEdge(pcm, 0, pcm.length, bytesPerSample);
  const soundEnd = findSoundEdge(pcm, pcm.length - bytesPerSample, 0, -bytesPerSample);
  const start = Math.max(0, soundStart - marginBytes) & ~1; // stay sample-aligned
  const end = Math.min(pcm.length, soundEnd + bytesPerSample + marginBytes);
  if (end <= start) return pcm; // silent chunk — leave it as is rather than emptying it
  return pcm.subarray(start, end);
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

/**
 * Concatenate chunk PCM and derive the per-sentence timeline. Runs on every
 * load, not just every build, so trimming here reaches audio that was
 * already downloaded — no re-recording needed for tighter joins.
 */
function assemble(
  episode: PodcastEpisode,
  chunks: Chunk[],
  rawPieces: Uint8Array[],
  sampleRate: number,
): EpisodeAudio {
  const bytesPerSecond = sampleRate * 2; // 16-bit mono
  const pieces = rawPieces.map((piece) => trimSilence(piece, sampleRate));
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

  // A track remembers its own layout, so it keeps matching even after the
  // chunking limits change; only a track from before that field existed
  // falls back to recomputing it, with the limits it was actually built
  // under.
  const chunks = track.lineIndices
    ? chunksFromLayout(episode, track.lineIndices)
    : chunkEpisode(episode, LEGACY_CHUNK_LIMITS);
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
  // A resumed build must reuse the SAME layout it started with, or a chunk
  // already stored under the old numbering would be attached to the wrong
  // sentences. Only a track with no chunks recorded yet is free to adopt
  // the current limits.
  const existingTrack = await withStore(TRACKS, 'readonly', (store) =>
    request<TrackRecord | undefined>(store, (s) => s.get(episode.id)),
  ).catch(() => undefined);
  const chunks =
    existingTrack?.lineIndices && existingTrack.chunkCount > 0
      ? chunksFromLayout(episode, existingTrack.lineIndices)
      : chunkEpisode(episode);
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
        speech = await synthesizeSpeechPcm(chunks[i].text, lang, { signal, continuation: i > 0 });
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
          lineIndices: chunks.map((chunk) => chunk.lineIndices),
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
