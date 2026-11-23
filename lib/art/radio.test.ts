import { describe, expect, it } from 'vitest';

import {
  LINGER,
  newRadio,
  showing,
  speaking,
  stepRadio,
  TYPE_RATE,
  typed,
  type Voice,
} from './radio';

const voice: Voice = {
  from: 'Cyan',
  colour: '#18c8e0',
  gap: 5,
  cues: [
    { id: 'hi', when: () => true, lines: ['Hello.'] },
    { id: 'again', repeat: 10, when: (_, sent) => sent.has('hi'), lines: ['One.', 'Two.'] },
  ],
};

describe('the radio', () => {
  it('works for any racer: a line from its voice, with an id that runs on', () => {
    const a = stepRadio(newRadio(), voice, { t: 0, phase: 'chase', since: 0, gap: 0 });
    expect(a.say).toMatchObject({ from: 'Cyan', colour: '#18c8e0', text: 'Hello.', id: 1 });
    const b = stepRadio(a.radio, voice, { t: 5, phase: 'chase', since: 5, gap: 0 });
    expect(b.say).toMatchObject({ text: 'One.', id: 2 });
    // The repeat waits its time, then walks on through the lines.
    expect(stepRadio(b.radio, voice, { t: 9, phase: 'chase', since: 9, gap: 0 }).say).toBeNull();
    expect(stepRadio(b.radio, voice, { t: 15, phase: 'chase', since: 15, gap: 0 }).say?.text).toBe(
      'Two.',
    );
  });

  it('types a line out, then lingers', () => {
    const text = 'You will never get me.';
    expect(typed(text, 0)).toBe('');
    expect(typed(text, 3 / TYPE_RATE)).toBe('You');
    expect(typed(text, 99)).toBe(text);
    expect(speaking(text, 0.1)).toBe(true);
    expect(speaking(text, text.length / TYPE_RATE + 0.01)).toBe(false);
    expect(showing(text, text.length / TYPE_RATE + LINGER - 0.1)).toBe(true);
    expect(showing(text, text.length / TYPE_RATE + LINGER + 0.1)).toBe(false);
  });
});
