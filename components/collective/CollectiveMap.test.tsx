import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEMO_MEMBERS } from '@/lib/collective/model';
import { sharedThemes } from '@/lib/collective/themes';

import CollectiveMap, { labelLines } from './CollectiveMap';

describe('the group map', () => {
  afterEach(cleanup);

  it('draws every person as a star and every shared intention as a planet', () => {
    render(<CollectiveMap members={DEMO_MEMBERS} selected={[]} onToggle={vi.fn()} />);
    for (const m of DEMO_MEMBERS) {
      expect(screen.getByRole('button', { name: new RegExp(`^${m.name},`) })).toBeTruthy();
    }
    for (const t of sharedThemes(DEMO_MEMBERS)) {
      expect(screen.getByText(labelLines(t.name.toUpperCase())[0])).toBeTruthy();
    }
  });

  it('toggles a person by tap or keyboard and shows who is chosen', () => {
    const onToggle = vi.fn();
    const [a, b] = DEMO_MEMBERS;
    render(<CollectiveMap members={DEMO_MEMBERS} selected={[a.id]} onToggle={onToggle} />);

    const starA = screen.getByRole('button', { name: new RegExp(`^${a.name},`) });
    const starB = screen.getByRole('button', { name: new RegExp(`^${b.name},`) });
    expect(starA.getAttribute('aria-pressed')).toBe('true');
    expect(starB.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(starB);
    fireEvent.keyDown(starA, { key: 'Enter' });
    fireEvent.keyDown(starA, { key: ' ' });
    fireEvent.keyDown(starA, { key: 'x' });
    expect(onToggle.mock.calls).toEqual([[b.id], [a.id], [a.id]]);
  });
});

describe('planet labels', () => {
  it('wrap after the ampersand so neighbours stay narrow', () => {
    expect(labelLines('MUSIC & NIGHTS')).toEqual(['MUSIC &', 'NIGHTS']);
    expect(labelLines('A SHARED SPACE')).toEqual(['A SHARED SPACE']);
  });
});
