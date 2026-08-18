import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { NowPlayingBar } from '../components/podcast/NowPlayingBar';
import { TranscriptLine } from '../components/podcast/TranscriptLine';
import { BackIcon, HeadphonesIcon, TrashIcon } from '../components/icons';
import { useEpisodeAudio } from '../hooks/useEpisodeAudio';
import { usePodcastShelf } from '../hooks/usePodcastShelf';
import { usePodcastPlayer } from '../hooks/usePodcastPlayer';
import { isBuiltIn } from '../lib/episodeLibrary';
import { LANGUAGES } from '../lib/languages';
import { normalizeWord } from '../lib/textTokens';
import type { PodcastEpisode } from '../lib/types';
import { listBuiltEpisodeIds } from '../services/episodeAudio';
import { useAppStore } from '../store/useAppStore';

/** Rough spoken length. Short sentences land around 3.5s each. */
function estimateMinutes(lineCount: number): number {
  return Math.max(1, Math.round((lineCount * 3.5) / 60));
}

/**
 * Podcast tab: a shelf of listening episodes at the learner's level, each
 * one a single continuous track with the transcript scrolling in sync.
 *
 * Episodes are not tied to the calendar. Several ship with the app, so the
 * shelf is full and playable from the first visit with nothing to wait for,
 * and a new AI-written one can be added whenever the learner wants a fresh
 * topic. Any word in a transcript can be tapped to save it for later study.
 */
export function PodcastScreen() {
  const language = useAppStore((state) => state.language);
  const lastEpisodeId = useAppStore((state) => state.lastEpisodeId);
  const setLastEpisodeId = useAppStore((state) => state.setLastEpisodeId);
  const shelf = usePodcastShelf();

  const open = useMemo(
    () => shelf.episodes.find((episode) => episode.id === lastEpisodeId) ?? null,
    [shelf.episodes, lastEpisodeId],
  );

  if (!language) return null;

  if (open) {
    return <EpisodePlayer episode={open} onBack={() => setLastEpisodeId(null)} />;
  }

  return <EpisodeShelf shelf={shelf} onOpen={(id) => setLastEpisodeId(id)} />;
}

function EpisodeShelf({
  shelf,
  onOpen,
}: {
  shelf: ReturnType<typeof usePodcastShelf>;
  onOpen: (id: string) => void;
}) {
  const language = useAppStore((state) => state.language);
  const hasGeminiKey = useAppStore((state) => Boolean(state.geminiApiKey));
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const meta = language ? LANGUAGES[language] : null;

  // Which episodes already have their audio on the device, so the shelf can
  // say so — a downloaded one plays instantly and offline.
  useEffect(() => {
    let active = true;
    void listBuiltEpisodeIds()
      .then((ids) => {
        if (active) setDownloaded(new Set(ids));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [shelf.episodes]);

  return (
    <div className="px-5">
      <Header title="Podcast" />
      <p className="pb-4 text-sm text-slate-500">
        Short {meta?.name} episodes at your level. A few new words come back again and again, so
        they stick without a vocabulary list.
      </p>

      <ul className="space-y-2">
        {shelf.episodes.map((episode) => (
          <li key={episode.id}>
            <div className="flex items-center gap-1 rounded-3xl bg-white pr-2 shadow-sm">
              <button
                onClick={() => onOpen(episode.id)}
                className="min-w-0 flex-1 rounded-3xl px-4 py-3.5 text-left active:bg-cream-100"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-sage-100 px-2 py-0.5 text-xs font-bold text-sage-700">
                    {episode.level}
                  </span>
                  {!isBuiltIn(episode) && (
                    <span className="text-xs font-semibold text-slate-400">Yours</span>
                  )}
                  {downloaded.has(episode.id) && (
                    <span className="text-xs font-semibold text-sage-600">Downloaded</span>
                  )}
                </div>
                <p className="mt-1 truncate font-bold text-slate-800">{episode.title}</p>
                <p className="truncate text-xs text-slate-400">
                  {episode.topicEn} · about {estimateMinutes(episode.lines.length)} min ·{' '}
                  {episode.lines.length} sentences
                </p>
              </button>
              {!isBuiltIn(episode) && (
                <button
                  onClick={() => shelf.remove(episode.id)}
                  className="shrink-0 rounded-full p-2 text-slate-300 active:bg-cream-100 active:text-blush-500"
                  aria-label={`Delete ${episode.title}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
        {hasGeminiKey ? (
          <>
            <p className="text-sm font-semibold text-slate-700">Want a different subject?</p>
            <p className="mt-1 text-xs text-slate-400">
              A new episode is written for your level on a topic that isn't on your shelf yet, and
              then it stays there.
            </p>
            <Button onClick={shelf.write} disabled={shelf.writing} className="mt-4 w-full">
              {shelf.writing ? (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  Writing a new episode…
                </>
              ) : (
                <>
                  <HeadphonesIcon className="h-5 w-5" />
                  Write a new episode
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-700">Want more episodes?</p>
            <p className="mt-1 text-xs text-slate-400">
              Add your free Gemini API key in Settings and new episodes can be written for you on
              any topic — that's also what records the audio.
            </p>
          </>
        )}
        {shelf.error && <p className="mt-3 text-sm text-blush-600">{shelf.error}</p>}
      </div>
    </div>
  );
}

function EpisodePlayer({ episode, onBack }: { episode: PodcastEpisode; onBack: () => void }) {
  const audio = useEpisodeAudio(episode);
  const player = usePodcastPlayer(episode, audio.url, audio.timeline);
  const savedVocab = useAppStore((state) => state.savedVocab);
  const saveVocab = useAppStore((state) => state.saveVocab);
  const removeVocab = useAppStore((state) => state.removeVocab);

  const savedWords = useMemo(() => new Set(Object.keys(savedVocab)), [savedVocab]);

  /** Tapping a word toggles it, so a mis-tap is one tap to undo. */
  const toggleWord = (display: string, context: string, translation = '') => {
    const word = normalizeWord(display);
    if (!word) return;
    if (savedVocab[word]) {
      removeVocab(word);
      return;
    }
    saveVocab({
      word,
      display,
      // A glossary term carries its meaning; a word tapped in the flow of the
      // transcript doesn't, and that's fine — it's still worth collecting.
      translation,
      language: episode.language,
      savedAt: Date.now(),
      context,
    });
  };

  const current = episode.lines[player.index];

  return (
    <div className="px-5">
      {/* Pinned: the way back and the current line both stay reachable
          however far down the transcript the listener has scrolled. */}
      <div className="sticky top-0 z-10 -mx-5 border-b border-cream-200 bg-cream-50/95 px-5 pb-3 backdrop-blur">
        <div className="flex items-center gap-1 pt-3">
          <button
            onClick={onBack}
            className="rounded-full p-2 text-slate-400 active:bg-cream-100"
            aria-label="All episodes"
          >
            <BackIcon className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-slate-400">All episodes</span>
        </div>

        {audio.status === 'ready' ? (
          <NowPlayingBar
            line={current}
            currentTime={player.currentTime}
            duration={player.duration}
            playing={player.playing}
            onToggle={player.toggle}
            onSeekTime={player.seekToTime}
            onSkip={player.skip}
          />
        ) : (
          <AudioSetup episode={episode} audio={audio} />
        )}
      </div>

      <div className="pt-3">
        <p className="text-lg font-bold text-slate-800">{episode.title}</p>
        <p className="text-xs text-slate-400">
          {episode.topicEn} · {episode.level} · about {estimateMinutes(episode.lines.length)} min ·
          tap any word to save it
        </p>
      </div>

      <ul className="mt-3 space-y-1">
        {episode.lines.map((line, i) => (
          <TranscriptLine
            key={i}
            line={line}
            index={i}
            active={audio.status === 'ready' && i === player.index}
            savedWords={savedWords}
            onWordTap={toggleWord}
            onSeek={audio.status === 'ready' ? player.seekToLine : undefined}
          />
        ))}
      </ul>

      {episode.vocab.length > 0 && (
        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            New words in this episode
          </p>
          <ul className="mt-3 space-y-2">
            {episode.vocab.map((item) => {
              const saved = savedWords.has(normalizeWord(item.term));
              return (
                <li key={item.term}>
                  <button
                    onClick={() => toggleWord(item.term, item.en, item.en)}
                    className={`flex w-full items-baseline gap-2 rounded-2xl px-3 py-2 text-left transition-colors ${
                      saved ? 'bg-sage-100' : 'active:bg-cream-100'
                    }`}
                  >
                    <span
                      className={`font-bold ${saved ? 'text-sage-800' : 'text-slate-800'}`}
                    >
                      {item.term}
                    </span>
                    <span className="text-sm text-slate-500">{item.en}</span>
                    <span className="ml-auto shrink-0 text-xs font-semibold text-sage-600">
                      {saved ? 'Saved' : 'Save'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {player.finished && (
        <Button variant="secondary" onClick={player.restart} className="mt-4 w-full">
          Play again from the start
        </Button>
      )}
    </div>
  );
}

/**
 * What the top of the screen shows until the track exists. The download
 * starts on its own, so this is progress rather than a prompt — it only
 * becomes a button when something went wrong or there is no key to record
 * with. The transcript below stays readable throughout, so an episode is
 * useful to read even before it can be heard.
 */
function AudioSetup({
  episode,
  audio,
}: {
  episode: PodcastEpisode;
  audio: ReturnType<typeof useEpisodeAudio>;
}) {
  const hasGeminiKey = useAppStore((state) => Boolean(state.geminiApiKey));
  const percent = audio.progress
    ? Math.round((audio.progress.done / Math.max(audio.progress.total, 1)) * 100)
    : 0;

  if (audio.status === 'building' || audio.status === 'checking') {
    return (
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-sage-500" />
          {audio.status === 'checking'
            ? 'Looking for the audio…'
            : `Downloading the episode… ${audio.progress?.done ?? 0}/${audio.progress?.total ?? '?'}`}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sage-100">
          <div
            className="h-full rounded-full bg-sage-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Once only — after this it plays instantly, offline, and keeps going with the screen
          locked. You can start reading now.
        </p>
      </div>
    );
  }

  if (!hasGeminiKey) {
    return (
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">Read-only for now</p>
        <p className="mt-1 text-xs text-slate-400">
          The transcript and its translation are below. Add your free Gemini API key in Settings to
          hear the episode read aloud.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-700">Download stopped</p>
      <p className="mt-1 text-xs text-slate-400">
        {episode.lines.length} sentences · about {audio.chunkTotal} short requests. Whatever was
        already recorded is kept, so this carries on where it stopped.
      </p>
      <Button onClick={audio.build} className="mt-4 w-full">
        <HeadphonesIcon className="h-5 w-5" />
        Resume download
      </Button>
      {audio.error && <p className="mt-2 text-sm text-blush-600">{audio.error}</p>}
    </div>
  );
}
