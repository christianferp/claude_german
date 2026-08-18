import { useEffect, useMemo, useRef } from 'react';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { NowPlayingBar } from '../components/podcast/NowPlayingBar';
import { TranscriptLine } from '../components/podcast/TranscriptLine';
import { HeadphonesIcon } from '../components/icons';
import { usePodcastEpisode } from '../hooks/usePodcastEpisode';
import { usePodcastPlayer } from '../hooks/usePodcastPlayer';
import { LANGUAGES } from '../lib/languages';
import { normalizeWord } from '../lib/textTokens';
import type { PodcastEpisode } from '../lib/types';
import { useAppStore } from '../store/useAppStore';

/** Rough spoken length, for the idle card. Short sentences ≈ 3.5s each. */
function estimateMinutes(lineCount: number): number {
  return Math.max(1, Math.round((lineCount * 3.5) / 60));
}

/**
 * Podcast tab: a short listening episode generated fresh each day on a new
 * topic, at the learner's level, deliberately repeating a handful of new
 * words so they stick from context. The transcript scrolls in sync with the
 * audio and any word can be tapped to save it for later study.
 */
export function PodcastScreen() {
  const language = useAppStore((state) => state.language);
  const hasGeminiKey = useAppStore((state) => Boolean(state.geminiApiKey));
  const { status, episode, error, topic, cached, load } = usePodcastEpisode();

  if (!language) return null;
  const meta = LANGUAGES[language];

  if (!hasGeminiKey) {
    return (
      <div className="px-5">
        <Header title="Podcast" />
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-3xl">🎧</p>
          <p className="mt-3 font-semibold text-slate-700">Episodes are AI-generated</p>
          <p className="mt-1 text-sm text-slate-500">
            Add your free Gemini API key in Settings and a new {meta.name} episode will be written
            for you every day, at your level.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'ready' && episode) {
    return <EpisodePlayer episode={episode} />;
  }

  return (
    <div className="px-5">
      <Header title="Podcast" />
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Today's episode · {meta.flag} {meta.name}
        </p>
        <p className="mt-2 text-2xl font-bold leading-snug text-slate-800">
          {topic?.en ?? 'Today'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          A short listening episode at your level. A few new words come back again and again, so
          they stick without a vocabulary list.
        </p>

        {status === 'loading' ? (
          <div className="mt-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-sage-500" />
              Writing today's episode…
            </p>
            <div className="mt-3 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-3 animate-pulse rounded-full bg-cream-100" />
              ))}
            </div>
          </div>
        ) : (
          <Button onClick={load} className="mt-5 w-full">
            <HeadphonesIcon className="h-5 w-5" />
            {cached ? "Open today's episode" : "Start today's episode"}
          </Button>
        )}

        {status === 'error' && error && <p className="mt-3 text-sm text-blush-600">{error}</p>}
        {status !== 'loading' && !cached && (
          <p className="mt-2 text-center text-xs text-slate-400">
            Written once, then saved on this device.
          </p>
        )}
      </div>
    </div>
  );
}

function EpisodePlayer({ episode }: { episode: PodcastEpisode }) {
  const player = usePodcastPlayer(episode);
  const savedVocab = useAppStore((state) => state.savedVocab);
  const saveVocab = useAppStore((state) => state.saveVocab);
  const removeVocab = useAppStore((state) => state.removeVocab);

  // Opening an episode is always a deliberate tap, so start speaking right
  // away rather than making the user hunt for play. Runs once per episode;
  // the player bails out on its own if no audio reaches the speaker.
  const { play } = player;
  const started = useRef<string | null>(null);
  useEffect(() => {
    if (started.current === episode.id) return;
    started.current = episode.id;
    play();
  }, [episode.id, play]);

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
      <Header title="Podcast" />

      {current && (
        <NowPlayingBar
          line={current}
          position={player.index}
          total={episode.lines.length}
          playing={player.playing}
          onToggle={player.toggle}
          onPrev={player.prev}
          onNext={player.next}
        />
      )}

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
            active={i === player.index}
            savedWords={savedWords}
            onWordTap={toggleWord}
            onSeek={player.seekTo}
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
