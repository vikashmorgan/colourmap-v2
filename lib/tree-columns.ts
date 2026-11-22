/*
 * The G tree's two columns (2026-11-22: "left of art energy admin I want a column with my
 * priorities and right another column with mood, feeling, emotions and body").
 *
 * Pure: what each column says, from what the app already keeps. The left lists what matters now:
 * today's objectives still open, then the open missions, soonest due first. The right reads your
 * latest check-in: the mood slider, the feeling, the emotion you named, and the body. Words, not
 * scores; nothing is shown that was not written.
 */

export interface Objective {
  id: string;
  text: string;
  done: boolean;
  list: string;
  position: number;
}

export interface Mission {
  id: string;
  title: string;
  completed: boolean;
  dueOn: string | null;
  branch: string | null;
}

export interface CheckIn {
  sliderValue: number;
  emotionName: string | null;
  emotionColor: string | null;
  pulses: Partial<Record<'body' | 'attitude' | 'structure', number>> | null;
  feelingCompass: Partial<Record<'attitude' | 'emotions' | 'presence' | 'body', number>> | null;
  createdAt: string;
}

export interface Priority {
  text: string;
  /** 'today' for an objective, else the mission's due date (yyyy-mm-dd) or null. */
  when: string | null;
}

export interface StateLine {
  label: 'Mood' | 'Feeling' | 'Emotion' | 'Body';
  word: string;
  /** 0 to 1, for a quiet bar, or null when the line is a word only. */
  level: number | null;
  colour: string | null;
}

/** At most this many priorities: a column, not a list to scroll. */
export const MAX_PRIORITIES = 7;

/** The left column: open objectives for today in their order, then open missions by due date. */
export function priorities(objectives: Objective[], missions: Mission[]): Priority[] {
  const today = objectives
    .filter((o) => !o.done && o.list === 'today')
    .sort((a, b) => a.position - b.position)
    .map((o) => ({ text: o.text, when: 'today' }));
  const open = missions
    .filter((m) => !m.completed)
    .sort((a, b) => {
      if (a.dueOn && b.dueOn) return a.dueOn.localeCompare(b.dueOn);
      if (a.dueOn) return -1;
      if (b.dueOn) return 1;
      return 0;
    })
    .map((m) => ({ text: m.title, when: m.dueOn }));
  return [...today, ...open].slice(0, MAX_PRIORITIES);
}

const MOOD = ['Very low', 'Low', 'Heavy', 'Neutral', 'Good', 'Bright', 'Radiant'];
const BODY = ['Disconnected', 'Drained', 'Tired', 'OK', 'Good', 'Strong', 'Powerful'];
const FEELING = ['Closed', 'Guarded', 'Uneasy', 'Steady', 'Open', 'Warm', 'Alive'];

/** A 0–100 value as one of seven words, and its level. */
function step(words: string[], v: number) {
  const k = Math.max(0, Math.min(1, v / 100));
  return { word: words[Math.round(k * (words.length - 1))], level: k };
}

/** The right column from the latest check-in (the newest by date), or nothing before the first. */
export function stateLines(checkIns: CheckIn[]): StateLine[] {
  if (!checkIns.length) return [];
  const c = [...checkIns].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const out: StateLine[] = [{ label: 'Mood', ...step(MOOD, c.sliderValue), colour: null }];
  const feel = c.feelingCompass?.emotions ?? c.feelingCompass?.presence;
  if (typeof feel === 'number')
    out.push({ label: 'Feeling', ...step(FEELING, feel), colour: null });
  if (c.emotionName)
    out.push({ label: 'Emotion', word: c.emotionName, level: null, colour: c.emotionColor });
  const body = c.pulses?.body ?? c.feelingCompass?.body;
  if (typeof body === 'number') out.push({ label: 'Body', ...step(BODY, body), colour: null });
  return out;
}

/** "today", "30 Nov", or nothing: when a priority is for. */
export function whenLabel(when: string | null): string {
  if (!when) return '';
  if (when === 'today') return 'today';
  const d = new Date(`${when}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
