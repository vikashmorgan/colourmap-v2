import { cleanup, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ArtPhilosophy, GallerySpace, MARKETING, PROGRESS, STATEMENT } from './GallerySpace';

afterEach(cleanup);

describe('GallerySpace', () => {
  it('shows how far along the gallery is, open, and the marketing plan, closed', () => {
    const { container } = render(<GallerySpace />);
    const panels = container.querySelectorAll('details');
    expect(panels).toHaveLength(2);
    expect(panels[0]?.open).toBe(true);
    expect(panels[1]?.open).toBe(false);
    const steps = PROGRESS.flatMap((p) => p.steps);
    const done = steps.filter((s) => s.done).length;
    const ui = within(container);
    expect(
      ui.getByText(`How far along the digital gallery is · ${done} of ${steps.length}`),
    ).toBeTruthy();
    expect(ui.getByText('How to market it and get views')).toBeTruthy();
    expect(ui.getByText(MARKETING[0]!.title)).toBeTruthy();
  });
});

describe('ArtPhilosophy', () => {
  it('holds the statement in a panel that opens and closes, open at first', () => {
    const { container } = render(<ArtPhilosophy />);
    const panel = container.querySelector('details') as HTMLDetailsElement;
    expect(panel.open).toBe(true);
    for (const line of STATEMENT) expect(within(container).getByText(line)).toBeTruthy();
    panel.open = false;
    expect(panel.open).toBe(false);
  });
});
