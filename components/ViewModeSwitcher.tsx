'use client';

import { useViewMode } from './ViewModeContext';

export default function ViewModeSwitcher() {
  const { mode, setMode } = useViewMode();

  return (
    <button
      type="button"
      onClick={() => setMode(mode === 'desktop' ? 'phone' : 'desktop')}
      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {mode === 'desktop' ? 'Phone' : 'Desktop'}
    </button>
  );
}
