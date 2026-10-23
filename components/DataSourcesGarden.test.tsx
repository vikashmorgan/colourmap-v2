// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import DataSourcesGarden from './DataSourcesGarden';

describe('DataSourcesGarden', () => {
  afterEach(() => cleanup());

  it('renders the headliner sources', () => {
    render(<DataSourcesGarden />);
    expect(screen.getByTestId('data-sources-garden')).toBeDefined();
    expect(screen.getByTestId('source-our-world-in-data')).toBeDefined();
    expect(screen.getByTestId('source-gcp')).toBeDefined();
    expect(screen.getByTestId('source-world-bank-wdi')).toBeDefined();
    expect(screen.getByTestId('source-sipri')).toBeDefined();
  });

  it('filters by domain', () => {
    render(<DataSourcesGarden />);
    fireEvent.click(screen.getByRole('button', { name: 'Climate' }));
    expect(screen.getByTestId('source-gcp')).toBeDefined();
    expect(screen.queryByTestId('source-sipri')).toBeNull();
  });
});
