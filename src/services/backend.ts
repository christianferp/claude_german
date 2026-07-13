/**
 * Supabase-backed sync: user accounts, cross-device mastered phrases, and
 * opt-in recording backup.
 *
 * Offline-first contract: localStorage/IndexedDB remain the source of truth
 * for the running app; Supabase is the sync copy. Every remote call is
 * best-effort — failures never break the local flow. When credentials in
 * src/config.ts are empty the whole module is inert.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isBackendConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';
import type { Language, Level, MasteredEntry } from '../lib/types';
import { useAppStore } from '../store/useAppStore';
import { audioStorage } from './audioStorage';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isBackendConfigured) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

interface MasteredRow {
  user_id: string;
  phrase_id: string;
  mastered_at: string;
  recording_mime: string;
  has_audio: boolean;
}

async function currentUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Call once at app start: track auth state and sync on sign-in. */
export function initBackend(): void {
  const supabase = getSupabase();
  if (!supabase) return;
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null;
    useAppStore.getState().setAuthUser(user ? { id: user.id, email: user.email ?? '' } : null);
    if (user) void syncNow().catch(() => {});
  });
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function sendLoginCode(email: string): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: 'Backend is not configured.' };
  const { error } = await supabase.auth.signInWithOtp({ email });
  return { error: error ? error.message : null };
}

export async function confirmLoginCode(
  email: string,
  code: string,
): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: 'Backend is not configured.' };
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  return { error: error ? error.message : null };
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}

// ── Sync ────────────────────────────────────────────────────────────────────

async function uploadRecording(userId: string, phraseId: string, blob: Blob): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.storage
    .from('recordings')
    .upload(`${userId}/${phraseId}`, blob, { upsert: true, contentType: blob.type });
  return !error;
}

/** Push one freshly mastered phrase (called after the local save succeeded). */
export async function pushMastered(entry: MasteredEntry, blob?: Blob | null): Promise<void> {
  const supabase = getSupabase();
  const userId = await currentUserId();
  if (!supabase || !userId) return;

  const backup = useAppStore.getState().backupRecordings;
  let hasAudio = false;
  if (backup && blob) hasAudio = await uploadRecording(userId, entry.phraseId, blob);

  await supabase.from('mastered').upsert({
    user_id: userId,
    phrase_id: entry.phraseId,
    mastered_at: new Date(entry.masteredAt).toISOString(),
    recording_mime: entry.recordingMime,
    has_audio: hasAudio,
  } satisfies MasteredRow);
}

/**
 * Two-way merge: remote rows the device doesn't know land in the local store;
 * local-only rows are pushed up (with audio when backup is on). Also adopts
 * the remote language/level on a fresh device and pushes the local choice up.
 */
export async function syncNow(): Promise<void> {
  const supabase = getSupabase();
  const userId = await currentUserId();
  if (!supabase || !userId) return;
  const store = useAppStore.getState();

  // Mastered phrases — pull…
  const { data: rows } = await supabase.from('mastered').select('*');
  const remote = new Map((rows as MasteredRow[] | null)?.map((r) => [r.phrase_id, r]) ?? []);
  const incoming: MasteredEntry[] = [];
  for (const row of remote.values()) {
    const local = store.mastered[row.phrase_id];
    const remoteAt = Date.parse(row.mastered_at);
    if (!local || remoteAt > local.masteredAt) {
      incoming.push({ phraseId: row.phrase_id, masteredAt: remoteAt, recordingMime: row.recording_mime });
    }
  }
  if (incoming.length > 0) store.mergeMastered(incoming);

  // …and push what only exists locally.
  for (const entry of Object.values(store.mastered)) {
    if (remote.has(entry.phraseId)) continue;
    const blob = store.backupRecordings
      ? await audioStorage.getRecording(entry.phraseId).catch(() => null)
      : null;
    await pushMastered(entry, blob);
  }

  // Language/level state.
  const { data: stateRow } = await supabase
    .from('user_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (!store.language && stateRow?.language) {
    const levels = (stateRow.levels ?? {}) as Partial<Record<Language, Level>>;
    const language = stateRow.language as Language;
    if (levels[language]) store.setLevel(language, levels[language]);
    store.setLanguage(language);
  } else if (store.language) {
    await supabase.from('user_state').upsert({
      user_id: userId,
      language: store.language,
      levels: store.levels,
      updated_at: new Date().toISOString(),
    });
  }
}

/** Fetch a recording backed up from another device; caches it locally. */
export async function downloadRecording(phraseId: string): Promise<Blob | null> {
  const supabase = getSupabase();
  const userId = await currentUserId();
  if (!supabase || !userId) return null;
  const { data } = await supabase.storage.from('recordings').download(`${userId}/${phraseId}`);
  if (!data) return null;
  await audioStorage.saveRecording(phraseId, data).catch(() => {});
  return data;
}

/** Wipe the signed-in user's server copy (used by "Reset progress"). */
export async function clearRemote(): Promise<void> {
  const supabase = getSupabase();
  const userId = await currentUserId();
  if (!supabase || !userId) return;
  await supabase.from('mastered').delete().eq('user_id', userId);
  const { data: files } = await supabase.storage.from('recordings').list(userId);
  if (files && files.length > 0) {
    await supabase.storage.from('recordings').remove(files.map((f) => `${userId}/${f.name}`));
  }
}
