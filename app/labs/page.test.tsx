import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LABS } from '@/lib/labs/registry';

import LabsPage from './page';

describe('Labs page', () => {
  it('links to every prototype', () => {
    render(<LabsPage />);
    for (const lab of LABS) {
      const link = screen.getByRole('link', { name: new RegExp(lab.title) });
      expect(link.getAttribute('href')).toBe(`/labs/${lab.slug}`);
    }
  });
});
