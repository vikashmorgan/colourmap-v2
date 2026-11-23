import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import CollectivePage, { metadata } from './page';

describe('/collective', () => {
  afterEach(cleanup);

  it('renders the Collective Brain with its own title', () => {
    render(<CollectivePage />);
    expect(screen.getByRole('heading', { name: 'Collective Brain' })).toBeTruthy();
    expect(metadata.title).toEqual({ absolute: 'Collective Brain' });
  });
});
