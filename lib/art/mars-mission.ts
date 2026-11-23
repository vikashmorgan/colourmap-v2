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
      lines: [
        '…Fine. You got me. This time.',
        'Lucky. Pure dumb luck.',
        "Okay, okay. Don't let it go to your head.",
      ],
    },
    {
      id: 'hit',
      now: true,
      repeat: 4,
      when: (s) => s.phase === 'chase' && s.hitAt !== undefined && s.t - s.hitAt < 1.2,
      lines: [
        'Ow! That was my good fender!',
        'Cheap shot, rust-bucket.',
        'You scratched the paint, you animal.',
        "Missed me. …No, that one didn't.",
        'Do you know what these cost?',
      ],
    },
    {
      id: 'start',
      when: (s) => s.since >= CARD_TIME - 0.6,
      lines: [
        "You'll never get me, you loser.",
        "Catch me if you can. You can't.",
        'Oh look, the slow one is back.',
      ],
    },
    {
      id: 'near',
      repeat: 25,
      when: (s, sent) => sent.has('start') && s.phase === 'chase' && s.gap < 90,
      lines: [
        'Get off my tail, rust-bucket!',
        'Personal space, please.',
        'Breathing down my neck? Gross.',
      ],
    },
    {
      id: 'close',
      repeat: 45,
      when: (s, sent) => sent.has('start') && s.phase === 'chase' && s.gap < 320 && s.gap >= 90,
      lines: ['Oh, you found me. Cute.', 'Is that you in my mirror?', "Don't get excited."],
    },
    {
      id: 'crater',
      repeat: 80,
      when: (s, sent) => sent.has('start') && s.phase === 'chase' && s.region === 'crater',
      lines: ['Nice hole. Stay in it.', "Mind the rim. Or don't."],
    },
    {
      id: 'lakes',
      repeat: 80,
      when: (s, sent) => sent.has('start') && s.phase === 'chase' && s.region === 'lakes',
      lines: ['Go on, have a swim. You glow better.', "Hear that clicking? That's you, cooking."],
    },
    {
      id: 'behind',
      repeat: 35,
      when: (s, sent) => sent.has('start') && s.phase === 'chase' && s.gap > 1600,
      lines: [
        "Can't even see you back there.",
        'Is that engine running on hope?',
        'I could stop for tea and still win.',
        'Hello? Anyone? Just dust back there.',
        'Do you need directions?',
      ],
    },
    {
      id: 'lost',
      repeat: 30,
      when: (s, sent) =>
        (sent.has('close') || sent.has('near')) && s.phase === 'chase' && s.gap > 700,
      lines: [
        'And… gone. Bye, loser.',
        'So long, slowpoke.',
        "Was nice while it lasted. It wasn't.",
      ],
    },
  ],
};
