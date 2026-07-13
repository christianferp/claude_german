import { useEffect, useRef, useState } from 'react';
import { isBackendConfigured } from '../config';
import { LANGUAGE_LIST } from '../lib/languages';
import { LEVELS } from '../lib/types';
import { clearRemote, confirmLoginCode, sendLoginCode, signOut, syncNow } from '../services/backend';
import { GEMINI_TTS_MODELS, verifyGeminiKey, type KeyVerification } from '../services/gemini';
import { useAppStore } from '../store/useAppStore';
import { LockIcon } from './icons';

const KEY_STATUS_LINES: Record<Exclude<KeyVerification, 'unchecked'>, { text: string; className: string }> = {
  checking: { text: 'Checking the key…', className: 'text-slate-400' },
  valid: { text: '✓ Key confirmed — the AI voice is active.', className: 'text-sage-600' },
  invalid: { text: '✗ Google rejected this key. Double-check it (no spaces, full length).', className: 'text-blush-600' },
  'network-error': {
    text: "Couldn't reach Google to verify — the key will be tried when you tap Listen.",
    className: 'text-slate-400',
  },
};

/** Bottom-sheet modal: switch language / level, widget preview, reset. */
export function SettingsSheet() {
  const language = useAppStore((state) => state.language);
  const levels = useAppStore((state) => state.levels);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setLevel = useAppStore((state) => state.setLevel);
  const setView = useAppStore((state) => state.setView);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const resetProgress = useAppStore((state) => state.resetProgress);
  const geminiApiKey = useAppStore((state) => state.geminiApiKey);
  const setGeminiApiKey = useAppStore((state) => state.setGeminiApiKey);
  const geminiTtsModel = useAppStore((state) => state.geminiTtsModel);
  const setGeminiTtsModel = useAppStore((state) => state.setGeminiTtsModel);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // Account (Supabase e-mail code sign-in).
  const authUser = useAppStore((state) => state.authUser);
  const backupRecordings = useAppStore((state) => state.backupRecordings);
  const setBackupRecordings = useAppStore((state) => state.setBackupRecordings);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [authPhase, setAuthPhase] = useState<'idle' | 'sending' | 'code-sent' | 'verifying'>('idle');
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleSendCode = async () => {
    setAuthError(null);
    setAuthPhase('sending');
    const { error } = await sendLoginCode(email.trim());
    if (error) {
      setAuthError(error);
      setAuthPhase('idle');
    } else {
      setAuthPhase('code-sent');
    }
  };

  const handleConfirmCode = async () => {
    setAuthError(null);
    setAuthPhase('verifying');
    const { error } = await confirmLoginCode(email.trim(), code.trim());
    if (error) {
      setAuthError(error);
      setAuthPhase('code-sent');
    } else {
      // onAuthStateChange updates the store and kicks off the first sync.
      setAuthPhase('idle');
      setCode('');
    }
  };

  // Verify the key against Google whenever it changes (debounced) so the
  // user gets a confirmation it's OK before leaving Settings.
  const [keyStatus, setKeyStatus] = useState<KeyVerification>('unchecked');
  const verifyRun = useRef(0);
  useEffect(() => {
    const run = ++verifyRun.current;
    if (!geminiApiKey) {
      setKeyStatus('unchecked');
      return;
    }
    setKeyStatus('checking');
    const timer = window.setTimeout(() => {
      void verifyGeminiKey(geminiApiKey).then((status) => {
        if (verifyRun.current === run) setKeyStatus(status);
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [geminiApiKey]);

  const close = () => setSettingsOpen(false);

  return (
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label="Settings">
      <button className="absolute inset-0 bg-black/30" onClick={close} aria-label="Close settings" />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-cream-200" />
        <h2 className="text-lg font-bold text-slate-800">Settings</h2>

        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Language</p>
        <div className="mt-2 flex gap-2">
          {LANGUAGE_LIST.map((meta) => (
            <button
              key={meta.code}
              onClick={() => {
                setLanguage(meta.code);
                // No level chosen for this language yet → onboarding takes over.
                if (!levels[meta.code]) close();
              }}
              className={`flex-1 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                language === meta.code
                  ? 'border-sage-500 bg-sage-50 text-sage-700'
                  : 'border-cream-200 text-slate-500 active:bg-cream-100'
              }`}
            >
              {meta.flag} {meta.name}
            </button>
          ))}
        </div>

        {language && (
          <>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Level</p>
            <div className="mt-2 flex gap-2">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevel(language, lvl)}
                  className={`flex-1 rounded-2xl border-2 py-2.5 text-sm font-bold transition-colors ${
                    levels[language] === lvl
                      ? 'border-sage-500 bg-sage-50 text-sage-700'
                      : 'border-cream-200 text-slate-500 active:bg-cream-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
          AI voice (Gemini)
        </p>
        <input
          type="text"
          value={geminiApiKey}
          onChange={(event) => setGeminiApiKey(event.target.value)}
          placeholder="Paste your Google AI Studio API key"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Gemini API key"
          className="mt-2 w-full rounded-2xl border-2 border-cream-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:border-sage-500 focus:outline-none"
        />
        {keyStatus !== 'unchecked' && (
          <p className={`mt-1.5 px-1 text-xs font-semibold ${KEY_STATUS_LINES[keyStatus].className}`}>
            {KEY_STATUS_LINES[keyStatus].text}
          </p>
        )}
        <p className="mt-1.5 px-1 text-xs text-slate-400">
          Get a free key at{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-sage-600 underline"
          >
            aistudio.google.com/apikey
          </a>
          . It stays on this device. Without a key, playback uses the (more robotic) built-in
          browser voice.
        </p>

        {geminiApiKey && (
          <>
            <div className="mt-3 flex gap-2">
              {GEMINI_TTS_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setGeminiTtsModel(model.id)}
                  className={`flex-1 rounded-2xl border-2 py-2.5 text-sm font-bold transition-colors ${
                    geminiTtsModel === model.id
                      ? 'border-sage-500 bg-sage-50 text-sage-700'
                      : 'border-cream-200 text-slate-500 active:bg-cream-100'
                  }`}
                >
                  {model.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 px-1 text-xs text-slate-400">
              {GEMINI_TTS_MODELS.find((model) => model.id === geminiTtsModel)?.hint}
            </p>
          </>
        )}

        {isBackendConfigured && (
          <>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Account</p>
            {authUser ? (
              <div className="mt-2 rounded-2xl border-2 border-cream-200 p-4">
                <p className="text-sm font-semibold text-slate-700">{authUser.email}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Mastered phrases sync across your devices.
                </p>
                <label className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">Back up recordings too</span>
                  <input
                    type="checkbox"
                    checked={backupRecordings}
                    onChange={(event) => setBackupRecordings(event.target.checked)}
                    className="h-5 w-5 accent-sage-500"
                  />
                </label>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setSyncing(true);
                      void syncNow().finally(() => setSyncing(false));
                    }}
                    disabled={syncing}
                    className="flex-1 rounded-2xl bg-cream-100 px-3 py-2.5 text-sm font-semibold text-slate-600 active:bg-cream-200 disabled:text-slate-300"
                  >
                    {syncing ? 'Syncing…' : 'Sync now'}
                  </button>
                  <button
                    onClick={() => void signOut()}
                    className="flex-1 rounded-2xl bg-cream-100 px-3 py-2.5 text-sm font-semibold text-slate-600 active:bg-cream-200"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                {authPhase !== 'code-sent' && authPhase !== 'verifying' ? (
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      aria-label="E-mail for sign in"
                      className="min-w-0 flex-1 rounded-2xl border-2 border-cream-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:border-sage-500 focus:outline-none"
                    />
                    <button
                      onClick={() => void handleSendCode()}
                      disabled={!email.includes('@') || authPhase === 'sending'}
                      className="shrink-0 rounded-2xl bg-sage-500 px-4 py-3 text-sm font-semibold text-white active:bg-sage-600 disabled:bg-sage-200"
                    >
                      {authPhase === 'sending' ? 'Sending…' : 'Send code'}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      placeholder="6-digit code from your e-mail"
                      aria-label="Sign-in code"
                      className="min-w-0 flex-1 rounded-2xl border-2 border-cream-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:border-sage-500 focus:outline-none"
                    />
                    <button
                      onClick={() => void handleConfirmCode()}
                      disabled={code.trim().length < 6 || authPhase === 'verifying'}
                      className="shrink-0 rounded-2xl bg-sage-500 px-4 py-3 text-sm font-semibold text-white active:bg-sage-600 disabled:bg-sage-200"
                    >
                      {authPhase === 'verifying' ? 'Checking…' : 'Sign in'}
                    </button>
                  </div>
                )}
                {authError && <p className="mt-1.5 px-1 text-xs text-blush-600">{authError}</p>}
                {authPhase === 'code-sent' || authPhase === 'verifying' ? (
                  <p className="mt-1.5 px-1 text-xs text-slate-400">
                    Check your e-mail: enter the 6-digit code here — or simply tap the link in the
                    e-mail, which opens the app already signed in.
                  </p>
                ) : (
                  <p className="mt-1.5 px-1 text-xs text-slate-400">
                    Optional — sign in with your e-mail to keep your progress across devices.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <button
          onClick={() => {
            setView('widget');
            close();
          }}
          className="mt-5 flex w-full items-center gap-2 rounded-2xl bg-cream-100 px-4 py-3.5 text-sm font-semibold text-slate-600 active:bg-cream-200"
        >
          <LockIcon />
          Lockscreen widget preview
        </button>

        {confirmingReset ? (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirmingReset(false)}
              className="flex-1 rounded-2xl bg-cream-100 px-4 py-3.5 text-sm font-semibold text-slate-600"
            >
              Keep my progress
            </button>
            <button
              onClick={() => {
                resetProgress();
                void clearRemote().catch(() => {});
                setConfirmingReset(false);
              }}
              className="flex-1 rounded-2xl bg-blush-500 px-4 py-3.5 text-sm font-semibold text-white active:bg-blush-600"
            >
              Yes, delete everything
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingReset(true)}
            className="mt-3 w-full rounded-2xl px-4 py-3.5 text-sm font-semibold text-blush-600 active:bg-blush-100"
          >
            Reset progress…
          </button>
        )}
      </div>
    </div>
  );
}
