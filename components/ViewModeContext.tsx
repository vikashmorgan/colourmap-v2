'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type ViewMode = 'desktop' | 'phone';

const ViewModeContext = createContext<{ mode: ViewMode; mounted: boolean; setMode: (m: ViewMode) => void }>({
  mode: 'desktop',
  mounted: false,
  setMode: () => {},
});

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ViewMode>('desktop');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('colourmap-view') as ViewMode | null;
    if (saved === 'phone' || saved === 'desktop') setMode(saved);
    setMounted(true);
  }, []);

  function handleSet(m: ViewMode) {
    setMode(m);
    localStorage.setItem('colourmap-view', m);
  }

  return (
    <ViewModeContext.Provider value={{ mode, mounted, setMode: handleSet }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
