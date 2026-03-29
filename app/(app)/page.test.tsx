import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/CheckInForm', () => ({
  default: () => <div data-testid="check-in-form">CheckInForm</div>,
}));

import CockpitPage from './page';

describe('CockpitPage', () => {
  it('renders the cockpit content with check-in form and life scan placeholder', () => {
    const html = renderToStaticMarkup(<CockpitPage />);

    expect(html).toContain('Your life balance will land here.');
    expect(html).toContain('CheckInForm');
    expect(html).toContain('Life scan radar');
  });
});
