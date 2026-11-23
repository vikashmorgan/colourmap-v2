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

  it('yelps at once when an attack hits him, a different line each time', () => {
    const steps: Partial<RadioSituation>[] = Array.from({ length: 30 }, (_, i) => ({
      gap: 1000,
      hitAt: i >= 6 && i % 5 === 1 ? i : undefined,
    }));
    const said = play(steps);
    const hits = said.filter((m) =>
      RED_BASTARD.cues.find((c) => c.id === 'hit')?.lines.includes(m.text),
    );
    expect(hits.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < hits.length; i++) expect(hits[i].text).not.toBe(hits[i - 1].text);
  });

  it('taunts you in the crater and by the lakes', () => {
    const crater = play(Array.from({ length: 20 }, () => ({ region: 'crater' })));
    const lines = RED_BASTARD.cues.find((c) => c.id === 'crater')?.lines ?? [];
    expect(crater.some((m) => lines.includes(m.text))).toBe(true);
    const lakes = play(Array.from({ length: 20 }, () => ({ region: 'lakes' })));
    const lakeLines = RED_BASTARD.cues.find((c) => c.id === 'lakes')?.lines ?? [];
    expect(lakes.some((m) => lakeLines.includes(m.text))).toBe(true);
  });

  it('keeps every line short, and never opens two runs the same way', () => {
    for (const c of RED_BASTARD.cues) for (const l of c.lines) expect(l.length).toBeLessThan(48);
    const open = (seed: number) =>
      stepRadio(newRadio(seed), RED_BASTARD, { t: 10, phase: 'chase', since: 10, gap: 1000 }).say
        ?.text;
    expect(open(1)).not.toBe(open(2));
  });

  it('never says the same line twice in a row over a long chase', () => {
    let r = newRadio(3);
    let last = '';
    for (let i = 0; i < 600; i++) {
      const gap = 2000 * Math.abs(Math.sin(i / 40)) + 20;
      const out = stepRadio(r, RED_BASTARD, {
        t: i,
        phase: 'chase',
        since: i,
        gap,
        hitAt: i % 37 === 0 ? i : undefined,
        region: i % 120 < 20 ? 'crater' : null,
      });
      r = out.radio;
      if (out.say) {
        expect(out.say.text).not.toBe(last);
        last = out.say.text;
      }
    }
  });
});
