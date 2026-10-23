// Single source of truth for the World mode's visual palette.
// Aligned with the existing Education layer aesthetic — deep warm-brown shell,
// warm-gold text on dark, warm parchment cards, amber accents (no cool navy).

export const THEME = {
  // shell
  shellBgDark: 'rgba(18,10,4,0.99)',
  shellBgParchment:
    'linear-gradient(180deg, rgba(236,220,188,0.74), rgba(206,184,145,0.34)), radial-gradient(circle at 20% 12%, rgba(122,84,56,0.10), transparent 36%)',

  // text on parchment
  ink: '#2a1d0e',
  inkStrong: '#1f1408',
  inkMuted: 'rgba(54,38,22,0.72)',
  inkLabel: 'rgba(82,58,38,0.70)',

  // text on dark
  gold: 'rgba(240,216,152,0.92)',
  goldStrong: '#ffe6aa',
  goldMuted: 'rgba(196,160,96,0.72)',
  goldLabel: 'rgba(196,160,96,0.66)',

  // accents
  accent: '#b06b1c', // primary amber
  accentSoft: 'rgba(176,107,28,0.18)',
  accentBorder: 'rgba(122,84,56,0.42)',
  accentBorderSoft: 'rgba(122,84,56,0.22)',

  // surfaces
  cardBg: 'rgba(255,248,231,0.82)',
  cardBgSoft: 'rgba(255,248,231,0.5)',
  cardBorder: 'rgba(122,84,56,0.22)',
  divider: 'rgba(122,84,56,0.16)',

  // semantic
  good: '#6a9a55',
  warn: '#c08a3a',
  bad: '#b34a2e',

  // confidence
  highConfidence: '#6a9a55',
  medConfidence: '#c08a3a',
  lowConfidence: '#b34a2e',
} as const;

export type Theme = typeof THEME;
