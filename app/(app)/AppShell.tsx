'use client';

import { useViewMode } from '@/components/ViewModeContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { mode } = useViewMode();

  if (mode === 'phone') {
    return <div className="mx-auto w-full max-w-sm px-4 py-6">{children}</div>;
  }

  return <div className="mx-auto w-full max-w-5xl px-6 py-10">{children}</div>;
}
