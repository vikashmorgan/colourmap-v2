/**
 * Drive, Mars: the mission (docs/specs/drive-game.md, world 8). Pure: its phases, the clock, the
 * catch and the best time, and the Red Bastard's voice on the radio.
 *
 * 2026-11-23: "on mars put Mission Unlocked. Follow the Red Bastard. (and u have to find the dude
 * with the red ship red line speeding in the distance. add a cloud of dust behind his trail.)"
 *
 * The mission begins when you first drive on Mars: a card ("Mission Unlocked · Follow the Red
 * Bastard") shows for its first seconds while the clock already runs; getting within the catch
 * distance of him stops it ("Caught the Red Bastard", your time) and keeps the best on the device.
 */

import { BASTARD } from '@/lib/art/mars';
import type { Voice } from '@/lib/art/radio';

export type MissionPhase = 'card' | 'chase' | 'caught';

export interface Mission {
  phase: MissionPhase;
  start: number;
  /** When he was caught and how long it took (s). */
  caughtAt: number | null;
  time: number | null;
  best: number | null;
  record: boolean;
}

/** How long the opening card shows (s), and the caught card. */
export const CARD_TIME = 4.2;
export const CAUGHT_CARD = 6;

/** Where bests are kept, per vehicle (like `drive.best.<world>.<vehicle>`). */
export function missionKey(vehicle: string): string {
  return `drive.mars.bastard.${vehicle}`;
}

export function newMission(t: number, best: number | null): Mission {
  return { phase: 'card', start: t, caughtAt: null, time: null, best, record: false };
}

/** The mission a moment on: the card gives way to the chase; close enough, he is caught. */
export function stepMission(m: Mission, t: number, gap: number): Mission {
  if (m.phase === 'caught') return m;
  if (gap < BASTARD.catchR) {
    const time = t - m.start;
    const record = m.best === null || time < m.best;
    return {
      ...m,
      phase: 'caught',
      caughtAt: t,
      time,
      record,
      best: record ? time : m.best,
    };
  }
  if (m.phase === 'card' && t - m.start >= CARD_TIME) return { ...m, phase: 'chase' };
  return m;
}

/** Which card shows now: the opening, the catch, or none. */
export function missionCard(m: Mission | null, t: number): 'unlocked' | 'caught' | null {
  if (!m) return null;
  if (m.phase === 'card') return 'unlocked';
  if (m.phase === 'caught' && m.caughtAt !== null && t - m.caughtAt < CAUGHT_CARD) return 'caught';
  return null;
}

/** The Red Bastard on the radio. */
export const RED_BASTARD: Voice = {
  from: 'Red Bastard',
  colour: '#ff4a2a',
  gap: 9,
  cues: [
    {
      id: 'caught',
      now: true,
      when: (s) => s.phase === 'caught',
      lines: ['…Fine. You got me. This time.'],
    },
    {
      id: 'start',
      when: (s) => s.since >= CARD_TIME - 0.6,
      lines: ["You'll never get me, you loser."],
    },
    {
      id: 'near',
      when: (s, sent) => sent.has('start') && s.gap < 90,
      lines: ['Get off my tail, rust-bucket!'],
    },
    {
      id: 'close',
      when: (s, sent) => sent.has('start') && !sent.has('near') && s.gap < 320,
      lines: ['Oh, you found me. Cute.'],
    },
    {
      id: 'behind',
      repeat: 35,
      when: (s, sent) => sent.has('start') && s.phase === 'chase' && s.gap > 1600,
      lines: [
        "Can't even see you back there.",
        'Is that engine running on hope?',
        'I could stop for tea and still win.',
      ],
    },
    {
      id: 'lost',
      when: (s, sent) =>
        (sent.has('close') || sent.has('near')) && s.phase === 'chase' && s.gap > 700,
      lines: ['And… gone. Bye, loser.'],
    },
  ],
};
