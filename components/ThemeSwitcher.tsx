'use client';

import { useEffect, useState } from 'react';

const COLOR_THEMES = [
  { id: 'paper', label: 'Paper', className: '', color: '#F2E8D0' },
  { id: 'golden', label: 'Golden', className: 'golden', color: '#E8C97A' },
  { id: 'night', label: 'Night', className: 'dark', color: '#150C04' },
] as const;

const TYPO_THEMES = [
  { id: 'normal', label: 'Normal', font: 'var(--font-serif)', preview: 'Aa' },
  { id: 'cowboy', label: 'Cowboy', font: 'var(--font-cowboy)', preview: 'Aa' },
  { id: 'groovy', label: 'Groovy', font: 'var(--font-groovy)', preview: 'Aa' },
  { id: 'minimal', label: 'Minimal', font: 'var(--font-minimal)', preview: 'Aa' },
] as const;

type ColorId = (typeof COLOR_THEMES)[number]['id'];
type TypoId = (typeof TYPO_THEMES)[number]['id'];

function applyColorTheme(id: ColorId) {
  const theme = COLOR_THEMES.find((t) => t.id === id);
  if (!theme) return;
  const html = document.documentElement;
  for (const t of COLOR_THEMES) {
    if (t.className) html.classList.remove(t.className);
  }
  if (theme.className) html.classList.add(theme.className);
  localStorage.setItem('colourmap-theme', id);
}

function applyTypoTheme(id: TypoId) {
  const typo = TYPO_THEMES.find((t) => t.id === id);
  if (!typo) return;
  document.documentElement.style.setProperty('--font-heading', typo.font);
  localStorage.setItem('colourmap-typo', id);
}

export default function ThemeSwitcher() {
  const [colorActive, setColorActive] = useState<ColorId>('paper');
  const [typoActive, setTypoActive] = useState<TypoId>('normal');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'color' | 'typo'>('color');

  useEffect(() => {
    const savedColor = localStorage.getItem('colourmap-theme') as ColorId | null;
    if (savedColor && COLOR_THEMES.some((t) => t.id === savedColor)) {
      setColorActive(savedColor);
      applyColorTheme(savedColor);
    }
    const savedTypo = localStorage.getItem('colourmap-typo') as TypoId | null;
    if (savedTypo && TYPO_THEMES.some((t) => t.id === savedTypo)) {
      setTypoActive(savedTypo);
      applyTypoTheme(savedTypo);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  const activeColor = COLOR_THEMES.find((t) => t.id === colorActive) ?? COLOR_THEMES[0];

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <div
          className="h-4 w-4 rounded-full border border-border"
          style={{ backgroundColor: activeColor.color }}
        />
        <span>Design</span>
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 rounded-xl border border-border bg-card p-2 shadow-lg animate-in fade-in duration-150 min-w-[180px]">
          {/* Tabs */}
          <div className="flex gap-1 mb-2">
            <button
              type="button"
              onClick={() => setTab('color')}
              className={`flex-1 text-[10px] py-1 rounded-lg transition-colors ${tab === 'color' ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent/50'}`}
            >
              Color
            </button>
            <button
              type="button"
              onClick={() => setTab('typo')}
              className={`flex-1 text-[10px] py-1 rounded-lg transition-colors ${tab === 'typo' ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent/50'}`}
            >
              Typography
            </button>
          </div>

          {/* Color options */}
          {tab === 'color' && (
            <div className="flex flex-col gap-1">
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                    colorActive === theme.id ? 'bg-accent font-medium' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => {
                    setColorActive(theme.id);
                    applyColorTheme(theme.id);
                  }}
                >
                  <div
                    className="h-3.5 w-3.5 rounded-full border border-border"
                    style={{ backgroundColor: theme.color }}
                  />
                  <span>{theme.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Typography options */}
          {tab === 'typo' && (
            <div className="flex flex-col gap-1">
              {TYPO_THEMES.map((typo) => (
                <button
                  key={typo.id}
                  type="button"
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                    typoActive === typo.id ? 'bg-accent font-medium' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => {
                    setTypoActive(typo.id);
                    applyTypoTheme(typo.id);
                  }}
                >
                  <span className="text-sm w-6 text-center" style={{ fontFamily: typo.font }}>
                    {typo.preview}
                  </span>
                  <span>{typo.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
