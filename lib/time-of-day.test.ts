import { describe, expect, it } from 'vitest';

import { getTimeOfDay } from './time-of-day';

describe('getTimeOfDay', () => {
  it.each([
    [5, 'Good morning.', 'How are you starting the day?'],
    [8, 'Good morning.', 'How are you starting the day?'],
    [11, 'Good morning.', 'How are you starting the day?'],
    [12, 'Good afternoon.', 'Where are you at?'],
    [14, 'Good afternoon.', 'Where are you at?'],
    [16, 'Good afternoon.', 'Where are you at?'],
    [17, 'Winding down.', 'How are you feeling?'],
    [19, 'Winding down.', 'How are you feeling?'],
    [21, 'Winding down.', 'How are you feeling?'],
    [22, 'Still up.', 'How are you holding up?'],
    [0, 'Still up.', 'How are you holding up?'],
    [4, 'Still up.', 'How are you holding up?'],
  ])('hour %i returns greeting "%s" and label "%s"', (hour, greeting, label) => {
    const result = getTimeOfDay(hour);
    expect(result.greeting).toBe(greeting);
    expect(result.label).toBe(label);
  });
});
