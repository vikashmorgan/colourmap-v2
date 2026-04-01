'use client';

import { useEffect, useState } from 'react';

const THEMES = [
  { id: 'paper', label: 'Paper', className: '', color: '#F2E8D0' },
  { id: 'golden', label: 'Golden', className: 'golden', color: '#E8C97A' },
  { id: 'night', label: 'Night', className: 'dark', color: '#150C04' },
] as const;

type ThemeId = (typeof THEMES)[number]['id'];

function applyTheme(id: ThemeId) {
  const theme = THEMES.find((t) => t.id === id);
  if (!theme) return;
  const html = document.documentElement;
  for (const t of THEMES) {
    if (t.className) html.classList.remove(t.className);
  }
  if (theme.className) html.classList.add(theme.className);
  localStorage.setItem('colourmap-theme', id);
}

export default function ThemeSwitcher() {
  const [active, setActive] = useState<ThemeId>('paper');

  useEffect(() => {
    const saved = localStorage.getItem('colourmap-theme') as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setActive(saved);
      applyTheme(saved);
    }
  }, []);

  function handleSwitch(id: ThemeId) {
    setActive(id);
    applyTheme(id);
  }

  return (
    <div className="flex items-center gap-2">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          aria-label={`Switch to ${theme.label} theme`}
          aria-pressed={active === theme.id}
          className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
            active === theme.id ? 'border-foreground scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: theme.color }}
          onClick={() => handleSwitch(theme.id)}
        />
      ))}
    </div>
  );
}
