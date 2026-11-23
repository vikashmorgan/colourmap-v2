import { describe, expect, it } from 'vitest';

import { BASTARD } from './mars';
import {
  CARD_TIME,
  CAUGHT_CARD,
  missionCard,
  missionKey,
  newMission,
  RED_BASTARD,
  stepMission,
} from './mars-mission';
import { newRadio, type RadioMessage, type RadioSituation, stepRadio } from './radio';

describe('the mission', () => {
  it('opens on the card, then the chase, the clock running from the start', () => {
    let m = newMission(10, null);
    expect(missionCard(m, 10)).toBe('unlocked');
    m = stepMission(m, 10 + CARD_TIME - 0.1, 900);
    expect(m.phase).toBe('card');
    m = stepMission(m, 10 + CARD_TIME + 0.1, 900);
    expect(m.phase).toBe('chase');
    expect(missionCard(m, 15)).toBeNull();
  });

  it('is caught close enough: the time, a record, then the caught card for a while', () => {
    let m = stepMission(newMission(0, null), 5, 600);
    m = stepMission(m, 42, BASTARD.catchR - 1);
    expect(m.phase).toBe('caught');
    expect(m.time).toBe(42);
    expect(m.record).toBe(true);
    expect(m.best).toBe(42);
    expect(missionCard(m, 43)).toBe('caught');
    expect(missionCard(m, 42 + CAUGHT_CARD + 0.1)).toBeNull();
    // Once caught it stays caught.
    expect(stepMission(m, 50, 900)).toBe(m);
  });

  it('keeps the best: a slower catch is no record', () => {
    const m = stepMission(newMission(0, 30), 45, 2);
    expect(m.record).toBe(false);
    expect(m.best).toBe(30);
    expect(stepMission(newMission(0, 30), 20, 2).best).toBe(20);
  });

  it('keeps bests per vehicle', () => {
    expect(missionKey('car')).toBe('drive.mars.bastard.car');
  });
});

describe('the Red Bastard on the radio', () => {
  /** Plays a run of situations, one a second, returning what he said. */
  const play = (steps: Partial<RadioSituation>[]) => {
    let r = newRadio();
    const said: RadioMessage[] = [];
    steps.forEach((s, i) => {
      const out = stepRadio(r, RED_BASTARD, {
        t: i,
        phase: 'chase',
        since: i,
        gap: 1000,
        ...s,
      });
      r = out.radio;
      if (out.say) said.push(out.say);
    });
    return said;
  };

  it('opens with the taunt once the card has gone, with his name above it', () => {
    const said = play(Array.from({ length: 12 }, () => ({})));
    expect(said[0].text).toBe("You'll never get me, you loser.");
    expect(said[0].from).toBe('Red Bastard');
    expect(said[0].at).toBeGreaterThanOrEqual(CARD_TIME - 1);
    expect(said).toHaveLength(1);
  });

  it('never speaks within the gap, and does not repeat itself', () => {
    const said = play(Array.from({ length: 30 }, (_, i) => ({ gap: i < 6 ? 1000 : 200 })));
    expect(said.map((m) => m.text)).toEqual([
      "You'll never get me, you loser.",
      'Oh, you found me. Cute.',
    ]);
    expect(said[1].at - said[0].at).toBeGreaterThanOrEqual(RED_BASTARD.gap);
  });

  it('taunts you again and again, in turn, while you are far behind', () => {
    const said = play(Array.from({ length: 120 }, () => ({ gap: 2500 })));
    const behind = said.filter((m) => m.text !== "You'll never get me, you loser.");
    expect(behind.length).toBeGreaterThanOrEqual(3);
    expect(new Set(behind.slice(0, 3).map((m) => m.text)).size).toBe(3);
  });

  it('cuts in at once when he is caught', () => {
    const steps: Partial<RadioSituation>[] = Array.from({ length: 6 }, () => ({}));
    steps.push({ phase: 'caught', gap: 5 });
    const said = play(steps);
    expect(said.at(-1)?.text).toBe('…Fine. You got me. This time.');
    expect(said.at(-1)?.at).toBe(6);
  });
});
