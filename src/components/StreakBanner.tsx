import { localDateISO } from '../lib/dailyIndex';
import { streakStatus } from '../lib/streak';
import { useAppStore } from '../store/useAppStore';
import { FlameIcon, ShieldIcon } from './icons';

/**
 * The daily practice streak, shown at the top of Today and Practice so the
 * habit is impossible to miss. Reads as: how many days in a row, whether
 * today still needs practicing to keep it, and how many "freeze"
 * protections are banked (each covers one missed day for free).
 */
export function StreakBanner() {
  const dailyStreak = useAppStore((state) => state.dailyStreak);
  const status = streakStatus(dailyStreak, localDateISO());

  if (status.current === 0 && status.freezes === 0) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-2xl bg-cream-100 px-4 py-3">
        <FlameIcon className="h-5 w-5 text-slate-300" />
        <p className="text-sm font-semibold text-slate-500">Start a streak — practice today</p>
      </div>
    );
  }

  const urgent = status.atRisk && status.current >= 3;

  return (
    <div
      className={`mb-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
        urgent ? 'bg-amber-50' : status.atRisk ? 'bg-cream-100' : 'bg-sage-50'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <FlameIcon className={`h-5 w-5 ${urgent ? 'text-amber-500' : 'text-blush-500'}`} />
        <div>
          <p className={`text-sm font-bold ${urgent ? 'text-amber-700' : 'text-slate-700'}`}>
            {status.current === 0
              ? 'Practice today to start a new streak'
              : `${status.current} day${status.current === 1 ? '' : 's'} in a row`}
          </p>
          {status.atRisk && (
            <p className={`text-xs ${urgent ? 'text-amber-600' : 'text-slate-400'}`}>
              {urgent ? "Don't lose it — practice today!" : 'Practice today to keep it going'}
            </p>
          )}
        </div>
      </div>
      {status.freezes > 0 && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-sage-600">
          <ShieldIcon />
          {status.freezes} protection{status.freezes === 1 ? '' : 's'}
        </span>
      )}
    </div>
  );
}
