/** Streaks and the logbook grid, from the list of active local dates. */
import { localDate } from "./store";

function parseDate(text: string): Date {
  const [y, m, d] = text.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Days in a row with activity, ending today. If today has no activity yet, a
 * streak that reached yesterday still counts: it isn't broken until the day ends.
 */
export function currentStreak(activity: string[], today: Date): number {
  const days = new Set(activity);
  let day = days.has(localDate(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(localDate(day))) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function bestStreak(activity: string[]): number {
  const days = [...new Set(activity)].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of days) {
    run = previous !== null && localDate(addDays(parseDate(previous), 1)) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

export interface LogbookDay {
  date: string;
  active: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/** `weeks` full weeks (Monday to Sunday) ending with the current week. */
export function logbookWeeks(activity: string[], today: Date, weeks = 6): LogbookDay[][] {
  const days = new Set(activity);
  const todayText = localDate(today);
  const mondayOffset = (today.getDay() + 6) % 7; // 0 = Monday
  const start = addDays(today, -mondayOffset - (weeks - 1) * 7);

  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(start, w * 7 + d);
      const text = localDate(date);
      return { date: text, active: days.has(text), isToday: text === todayText, isFuture: date > today };
    }),
  );
}
