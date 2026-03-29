import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import CockpitPage from './page';

describe('CockpitPage', () => {
  it('renders the cockpit placeholder content', () => {
    const html = renderToStaticMarkup(<CockpitPage />);

    expect(html).toContain('Your life balance will land here.');
    expect(html).toContain('Latest check-in');
    expect(html).toContain('Life scan radar');
  });
});
