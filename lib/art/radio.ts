/**
 * Drive's radio (docs/specs/drive-game.md, Mars): the racer you follow talks to you. Pure: who
 * says what and when. Generic, so any racer can be given lines; the Red Bastard is the first.
 *
 * 2026-11-23: "a messaging menu where you follow the racers. Red Bastard sends u messages when u
 * start following him. U ll never get me u loser. with red bastard written above. like old radio
 * communications with a voice graph moving as he speaks."
 *
 * A voice has lines for a few cues. Each cue's condition is checked every frame; a cue fires once
 * (or again after its own repeat time), never sooner than `gap` seconds after the last line, except
 * cues marked `now` (the catch), which cut in at once.
 */

export interface RadioMessage {
  /** Who speaks (shown above the line), in their colour. */
  from: string;
  colour: string;
  text: string;
  /** When it was sent (the game's clock, s), and a running id. */
  at: number;
  id: number;
}

/** What a voice can see: the mission's phase, the time since it began and the gap to you (m). */
export interface RadioSituation {
  t: number;
  phase: 'card' | 'chase' | 'caught';
  since: number;
  gap: number;
}

export interface Cue {
  id: string;
  when: (s: RadioSituation, sent: ReadonlySet<string>) => boolean;
  lines: readonly string[];
  /** Fires again this long after it last did (s); once if absent. */
  repeat?: number;
  /** Cuts in at once, past the gap. */
  now?: boolean;
}

export interface Voice {
  from: string;
  colour: string;
  /** Seconds between two lines at least. */
  gap: number;
  cues: readonly Cue[];
}

export interface RadioState {
  sent: Set<string>;
  last: Map<string, number>;
  /** How many times each cue has spoken (to walk its lines in turn). */
  count: Map<string, number>;
  lastAt: number;
  id: number;
}

export function newRadio(): RadioState {
  return { sent: new Set(), last: new Map(), count: new Map(), lastAt: -1e9, id: 0 };
}

/** The line due now, if any (and the state after it). At most one per call. */
export function stepRadio(
  r: RadioState,
  voice: Voice,
  s: RadioSituation,
): { radio: RadioState; say: RadioMessage | null } {
  for (const cue of voice.cues) {
    const lastCue = r.last.get(cue.id);
    const ready =
      lastCue === undefined || (cue.repeat !== undefined && s.t - lastCue >= cue.repeat);
    if (!ready) continue;
    if (!cue.now && s.t - r.lastAt < voice.gap) continue;
    if (!cue.when(s, r.sent)) continue;
    const n = r.count.get(cue.id) ?? 0;
    const text = cue.lines[n % cue.lines.length];
    const radio: RadioState = {
      sent: new Set(r.sent).add(cue.id),
      last: new Map(r.last).set(cue.id, s.t),
      count: new Map(r.count).set(cue.id, n + 1),
      lastAt: s.t,
      id: r.id + 1,
    };
    return {
      radio,
      say: { from: voice.from, colour: voice.colour, text, at: s.t, id: radio.id },
    };
  }
  return { radio: r, say: null };
}

/** How fast a line is typed out (characters a second), and how long it stays after (s). */
export const TYPE_RATE = 28;
export const LINGER = 5;

/** How much of a line is showing `age` seconds after it was sent. */
export function typed(text: string, age: number): string {
  return text.slice(0, Math.max(0, Math.min(text.length, Math.floor(age * TYPE_RATE))));
}

/** Whether a line is still being spoken. */
export function speaking(text: string, age: number): boolean {
  return age >= 0 && age * TYPE_RATE < text.length;
}

/** Whether the panel still shows a line (typing, then lingering). */
export function showing(text: string, age: number): boolean {
  return age >= 0 && age < text.length / TYPE_RATE + LINGER;
}
