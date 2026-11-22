import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RaceResults } from './GameSheets';

const result = { time: '1:02.00', best: null, record: false, place: 2, standings: [] };

afterEach(cleanup);

describe('the results sheet', () => {
  it('says the race is over when you went off a twist, and offers another go', () => {
    const again = vi.fn();
    render(
      <RaceResults
        world="gold"
        result={{ ...result, wrecked: true }}
        onAgain={again}
        onTracks={() => {}}
      />,
    );
    expect(screen.getByText('U fucked up!')).toBeTruthy();
    expect(screen.getByText('Race over')).toBeTruthy();
    expect(screen.queryByText('2nd')).toBeNull();
    fireEvent.click(screen.getByText('Race again'));
    expect(again).toHaveBeenCalled();
  });

  it('shows your place and time after a race run to its end', () => {
    render(<RaceResults world="gold" result={result} onAgain={() => {}} onTracks={() => {}} />);
    expect(screen.getByText('2nd')).toBeTruthy();
    expect(screen.queryByText('U fucked up!')).toBeNull();
  });
});
