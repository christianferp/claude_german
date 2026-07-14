import { useEffect } from 'react';
import { usePasswordAuth } from '../hooks/usePasswordAuth';
import { useAppStore } from '../store/useAppStore';

/**
 * First-launch welcome: sign in / create an account to sync progress, or
 * skip straight to today's phrase without any account. Shown once — either
 * choice sets welcomeDone; signing in later is always possible in Settings.
 */
export function LoginScreen() {
  const auth = usePasswordAuth();
  const authUser = useAppStore((state) => state.authUser);
  const setWelcomeDone = useAppStore((state) => state.setWelcomeDone);

  // Sign-in completed (or a previous session was restored) → move along.
  useEffect(() => {
    if (authUser) setWelcomeDone(true);
  }, [authUser, setWelcomeDone]);

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <p className="text-4xl">🗣️</p>
      <h1 className="mt-4 text-3xl font-bold text-slate-800">Daily Phrase</h1>
      <p className="mt-2 text-slate-500">
        One phrase a day — listen, speak it out loud, master it.
      </p>

      <div className="mt-8 rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Sign in to keep your progress
        </p>
        <div className="mt-3 space-y-2">
          <input
            type="email"
            value={auth.email}
            onChange={(event) => auth.setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            aria-label="E-mail"
            className="w-full rounded-2xl border-2 border-cream-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:border-sage-500 focus:outline-none"
          />
          <input
            type="password"
            value={auth.password}
            onChange={(event) => auth.setPassword(event.target.value)}
            placeholder="Password (min. 6 characters)"
            autoComplete="current-password"
            aria-label="Password"
            className="w-full rounded-2xl border-2 border-cream-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:border-sage-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void auth.signUp()}
              disabled={!auth.ready || auth.busy !== 'idle'}
              className="flex-1 rounded-2xl bg-cream-100 px-4 py-3 text-sm font-semibold text-slate-600 active:bg-cream-200 disabled:text-slate-300"
            >
              {auth.busy === 'signup' ? 'Creating…' : 'Create account'}
            </button>
            <button
              onClick={() => void auth.signIn()}
              disabled={!auth.ready || auth.busy !== 'idle'}
              className="flex-1 rounded-2xl bg-sage-500 px-4 py-3 text-sm font-semibold text-white active:bg-sage-600 disabled:bg-sage-200"
            >
              {auth.busy === 'signin' ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
          {auth.error && <p className="px-1 text-xs text-blush-600">{auth.error}</p>}
          {auth.info && <p className="px-1 text-xs font-semibold text-sage-600">{auth.info}</p>}
          <p className="px-1 text-xs text-slate-400">
            Your mastered phrases follow you across devices.
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-cream-200" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">or</span>
        <span className="h-px flex-1 bg-cream-200" />
      </div>

      <button
        onClick={() => setWelcomeDone(true)}
        className="mt-6 w-full rounded-2xl border-2 border-sage-200 bg-white px-4 py-3.5 text-sm font-semibold text-sage-700 transition-all active:scale-[0.98] active:bg-sage-50"
      >
        Just try today's phrase — no account →
      </button>
      <p className="mt-2 text-center text-xs text-slate-400">
        You can sign in any time later from Settings.
      </p>
    </div>
  );
}
