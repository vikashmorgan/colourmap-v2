'use client';

import { useEffect, useMemo, useState } from 'react';
import { PROGRAMS, type Program } from '@/lib/programs';
import ComicProgram from './ComicProgram';
import LearningProgram from './LearningProgram';
import MathTrainer from './MathTrainer';
import PersonalityTypeProgram from './PersonalityTypeProgram';

const TRAINER_PROGRAMS = new Set(['math-trainer']);

const COMIC_PROGRAMS = new Set([
  'colourmap-vision-comic',
  'room-to-breathe',
  'emotional-intelligence',
  'self-talk',
  'wellbeing',
  'hope-energy',
  'struggle-letting-go',
  'sleep',
  'nervous-system',
  'grief',
  'belonging',
  'agency',
  'organisational-intelligence',
  'creativity',
  'relational-intelligence',
  'artificial-intelligence',
  'ai-future',
  'collective-evolution',
  'deep-attention',
  'fishing-in-the-dark',
  'conflict-repair',
  'money-anxiety',
  'signal-vs-noise',
  'finding-your-place',
  'art-of-trying',
  'identity-becoming',
  'avoidance-action',
  'parenting-patterns',
  'viktor-frankl',
  'bukowski-poems',
  'jack-london',
  'jules-verne',
  'maya-angelou',
  'plato-cave',
  'alan-watts',
  'david-hawkins',
  'nietzsche',
  'campbell-hero-quest',
  'carl-jung',
  'paulo-freire',
  'thich-nhat-hanh',
  'gandhi',
  'clear-allen',
  'economic-systems',
  'planetary-ecology',
  'future-transitions',
]);

const EDUCATION_IMAGES = ['/education-1.png', '/education-2.png', '/education-3.png'];
type EducationWorld = {
  href: string;
  title: string;
  label: string;
  body: string;
  tint: string;
  kind: 'link' | 'personality' | 'program';
  cover: string;
  coverPosition?: string;
  programKey?: string;
};

const EDUCATION_ENTERTAINMENT: EducationWorld[] = [
  {
    href: '/entertainment',
    title: 'Pineapple Planet',
    label: 'Interactive comic',
    body: 'A funny, reflective quest for The Juice through symbolic worlds.',
    tint: '#D39A3D',
    kind: 'link',
    cover: '/entertainment/billy/quest-for-juice/panel-9.webp',
    coverPosition: 'center 18%',
  },
  {
    href: '#colourmap-vision-comic',
    title: 'Colourmap Vision Comic',
    label: 'Project vision',
    body: 'The mission, interface dream, and future library of Colourmap.',
    tint: '#78A9B8',
    kind: 'program',
    cover: '/comics/colourmap-vision-comic/panel-0.webp',
    programKey: 'colourmap-vision-comic',
  },
];

const EDUCATION_WORLDS: EducationWorld[] = [
  {
    href: '#personality-map',
    title: 'Personality Map',
    label: 'Self-understanding test',
    body: 'Traits, story, gifts, frictions, and mode bridges.',
    tint: '#D0A35F',
    kind: 'personality',
    cover: '/education-worlds/personality-map-cover.webp',
  },
  {
    href: '/atlas',
    title: 'Living Atlas',
    label: 'Maps and knowledge',
    body: 'Wellbeing, society, hope, and shared maps.',
    tint: '#6B7A50',
    kind: 'link',
    cover: '/education-worlds/living-atlas-cover.webp',
  },
  {
    href: '/progress-road',
    title: 'Progress Roads',
    label: 'Hopeful timelines',
    body: 'History, change, peace, freedom, and future questions.',
    tint: '#6888B0',
    kind: 'link',
    cover: '/education-worlds/progress-roads-cover.webp',
  },
];

const POSITIVE_OVERLAY_PROGRAMS = new Set([
  'agency',
  'organisational-intelligence',
  'creativity',
  'relational-intelligence',
  'artificial-intelligence',
  'ai-future',
  'collective-evolution',
  'deep-attention',
  'fishing-in-the-dark',
  'conflict-repair',
  'money-anxiety',
  'signal-vs-noise',
  'finding-your-place',
  'art-of-trying',
  'identity-becoming',
  'avoidance-action',
  'parenting-patterns',
  'viktor-frankl',
  'bukowski-poems',
  'jack-london',
  'jules-verne',
  'maya-angelou',
  'plato-cave',
  'alan-watts',
  'david-hawkins',
  'nietzsche',
  'campbell-hero-quest',
  'economic-systems',
  'planetary-ecology',
  'future-transitions',
]);
const GENERATED_LAYERED_PANEL_COUNTS: Record<string, number> = {
  'carl-jung': 20,
  'paulo-freire': 11,
  'thich-nhat-hanh': 20,
  gandhi: 20,
  'clear-allen': 16,
};
const GENERATED_LAYERED_PANEL_EXTENSIONS: Record<string, string> = {
  'paulo-freire': 'webp',
  'thich-nhat-hanh': 'webp',
};
const POSITIVE_OVERLAY_PANEL_EXTENSIONS: Record<string, string> = {
  'conflict-repair': 'webp',
  'money-anxiety': 'webp',
  'signal-vs-noise': 'webp',
  'finding-your-place': 'webp',
  'art-of-trying': 'webp',
  'identity-becoming': 'webp',
  'avoidance-action': 'webp',
  'parenting-patterns': 'webp',
  'viktor-frankl': 'webp',
  'bukowski-poems': 'webp',
  'jack-london': 'webp',
  'jules-verne': 'webp',
  'maya-angelou': 'webp',
  'plato-cave': 'webp',
  'alan-watts': 'webp',
  'david-hawkins': 'webp',
  nietzsche: 'webp',
  'campbell-hero-quest': 'webp',
  'economic-systems': 'webp',
  'planetary-ecology': 'webp',
  'future-transitions': 'webp',
};
const LANDSCAPE_GENERATED_COVERS = new Set<string>();
const PROGRAM_COVER_PANEL: Record<string, number> = {
  'room-to-breathe': 2,
  'emotional-intelligence': 5,
  'self-talk': 2,
  wellbeing: 3,
  'hope-energy': 5,
  sleep: 4,
  'nervous-system': 3,
  grief: 5,
  'struggle-letting-go': 2,
  belonging: 4,
  agency: 2,
  'organisational-intelligence': 1,
  creativity: 3,
  'relational-intelligence': 2,
  'artificial-intelligence': 2,
  'ai-future': 4,
  'collective-evolution': 5,
  'deep-attention': 8,
  'signal-vs-noise': 5,
  'finding-your-place': 7,
  'art-of-trying': 9,
  'carl-jung': 12,
  'paulo-freire': 2,
  'thich-nhat-hanh': 2,
  gandhi: 11,
  'clear-allen': 0,
  'alan-watts': 1,
  'david-hawkins': 6,
  'jack-london': 6,
  'jules-verne': 11,
  'campbell-hero-quest': 2,
  'economic-systems': 39,
  'planetary-ecology': 39,
  'future-transitions': 19,
};
const SPECIAL_PROGRAM_COVERS: Record<string, string> = {};

const SERIF = 'var(--font-serif)';
const cream = (a: number) => `rgba(240,216,152,${a})`;
const och = (a: number) => `rgba(196,160,96,${a})`;

function col(color: string, a: number) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ── Colour progression within a group lane ─────────────────── */
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function progressionColor(tint: string, index: number, total: number): string {
  const [h, s, l] = hexToHsl(tint);
  const t = total > 1 ? index / (total - 1) : 0.5;
  // light → rich: lightness goes from l+0.18 down to l-0.12
  const newL = Math.max(0.15, Math.min(0.82, l + 0.18 - t * 0.3));
  return hslToHex(h, Math.min(s + 0.05, 1), newL);
}

/* ── Groups with tint color per category ─────────────────────── */
const GROUPS: {
  label: string;
  keys: string[];
  tint: string;
  startHere?: string;
  format?: 'guides';
}[] = [
  {
    label: 'Inner Life',
    keys: [
      'room-to-breathe',
      'emotional-intelligence',
      'self-talk',
      'wellbeing',
      'hope-energy',
      'sleep',
      'nervous-system',
      'grief',
      'struggle-letting-go',
      'belonging',
    ],
    tint: '#C4A060',
    startHere: 'emotional-intelligence',
  },
  {
    label: 'World Guides',
    keys: [
      'carl-jung',
      'gandhi',
      'clear-allen',
      'viktor-frankl',
      'paulo-freire',
      'thich-nhat-hanh',
    ],
    tint: '#B99367',
    format: 'guides',
  },
  {
    label: 'Literature',
    keys: ['bukowski-poems', 'jack-london', 'jules-verne', 'maya-angelou'],
    tint: '#9A7658',
    format: 'guides',
  },
  {
    label: 'Philosophy',
    keys: ['plato-cave', 'alan-watts', 'david-hawkins', 'nietzsche', 'campbell-hero-quest'],
    tint: '#8870A8',
    format: 'guides',
  },
  {
    label: 'Growth',
    keys: [
      'agency',
      'creativity',
      'relational-intelligence',
      'deep-attention',
      'conflict-repair',
      'money-anxiety',
      'signal-vs-noise',
      'finding-your-place',
      'art-of-trying',
      'avoidance-action',
      'identity-becoming',
    ],
    tint: '#6888B0',
    format: 'guides',
  },
  {
    label: 'Systems',
    keys: ['organisational-intelligence', 'collective-evolution', 'parenting-patterns'],
    tint: '#6B7A50',
    format: 'guides',
  },
  {
    label: 'World Systems',
    keys: ['economic-systems', 'planetary-ecology', 'future-transitions'],
    tint: '#6F8A58',
    format: 'guides',
  },
  {
    label: 'Intelligence',
    keys: ['artificial-intelligence', 'ai-future'],
    tint: '#7A8898',
    format: 'guides',
  },
  {
    label: 'Skills',
    keys: ['math-trainer'],
    tint: '#6B9B4E',
  },
];

function getProgress(program: Program): number {
  try {
    const saved = localStorage.getItem(`colourmap:program:${program.key}`);
    if (saved !== null) return Math.min(Number(saved) + 1, program.segments.length);
  } catch {}
  return 0;
}

function getProgramCoverSrc(program: Program): string {
  const specialCover = SPECIAL_PROGRAM_COVERS[program.key];
  if (specialCover) return specialCover;
  const coverPanel = PROGRAM_COVER_PANEL[program.key] ?? 0;
  const generatedCount = GENERATED_LAYERED_PANEL_COUNTS[program.key];
  if (generatedCount) {
    const extension = GENERATED_LAYERED_PANEL_EXTENSIONS[program.key] ?? 'jpg';
    return `/comics/${program.key}/generated/panel-${coverPanel % generatedCount}.${extension}`;
  }
  if (POSITIVE_OVERLAY_PROGRAMS.has(program.key)) {
    const extension = POSITIVE_OVERLAY_PANEL_EXTENSIONS[program.key] ?? 'jpg';
    return `/comics/${program.key}/variants/positive-overlay/panel-${coverPanel}.${extension}`;
  }
  if (COMIC_PROGRAMS.has(program.key)) {
    return `/comics/${program.key}/panel-${coverPanel}.jpg`;
  }
  return EDUCATION_IMAGES[0];
}

const PROGRAM_COVER_CROP: Record<string, { scale: number; position?: string }> = {
  'emotional-intelligence': { scale: 1.06, position: 'center center' },
  'self-talk': { scale: 1.06, position: 'center center' },
  'hope-energy': { scale: 1.06, position: 'center center' },
  'nervous-system': { scale: 1.035, position: 'center center' },
  grief: { scale: 1.035, position: 'center center' },
  belonging: { scale: 1.035, position: 'center center' },
  'jack-london': { scale: 1.02, position: '30% center' },
};

function getProgramCoverCrop(program: Program) {
  return PROGRAM_COVER_CROP[program.key] ?? { scale: 1, position: 'center center' };
}

const EDUCATION_QUOTES = [
  { text: 'Until you make the unconscious conscious, it will direct your life.', by: 'Carl Jung' },
  { text: 'The privilege of a lifetime is to become who you truly are.', by: 'Carl Jung' },
  { text: 'Be the change you wish to see in the world.', by: 'M. K. Gandhi' },
  { text: 'In a gentle way, you can shake the world.', by: 'M. K. Gandhi' },
  { text: 'Between stimulus and response, there is a space.', by: 'Viktor Frankl' },
  {
    text: 'When we cannot change a situation, we are challenged to change ourselves.',
    by: 'Viktor Frankl',
  },
  { text: 'The point of life is not the final note.', by: 'Alan Watts' },
  { text: 'You are something the whole universe is doing.', by: 'Alan Watts' },
  { text: 'Peace is every step.', by: 'Thich Nhat Hanh' },
  { text: 'No mud, no lotus.', by: 'Thich Nhat Hanh' },
  { text: 'Education is an act of love.', by: 'Paulo Freire' },
  { text: 'Hope is an ontological need.', by: 'Paulo Freire' },
  { text: 'Follow your bliss.', by: 'Joseph Campbell' },
  { text: 'The cave you fear to enter holds the treasure you seek.', by: 'Joseph Campbell' },
  { text: 'He who has a why can bear almost any how.', by: 'Friedrich Nietzsche' },
  { text: 'Become who you are.', by: 'Friedrich Nietzsche' },
  { text: 'Surrender releases the resistance that keeps suffering alive.', by: 'David Hawkins' },
  { text: 'Rise with dignity, even after silence.', by: 'Maya Angelou' },
  { text: 'What you pay attention to becomes the shape of your life.', by: 'Colourmap' },
  { text: 'The real task is often smaller than the emotion around it.', by: 'Colourmap' },
  { text: 'A map is useful when it helps you return to the road.', by: 'Colourmap' },
  { text: 'The wild asks whether comfort has become too small.', by: 'Jack London' },
  { text: 'Courage is not noise. It is a steady movement through fear.', by: 'Colourmap' },
  { text: 'The signal is the thing that still matters after the panic fades.', by: 'Colourmap' },
  { text: 'A life grows when attention becomes honest.', by: 'Colourmap' },
  { text: 'The page is not the lesson. The return to life is the lesson.', by: 'Colourmap' },
] as const;

function pickEducationQuote() {
  const next = Math.floor(Math.random() * EDUCATION_QUOTES.length);
  try {
    const previous = Number(sessionStorage.getItem('colourmap:last-education-quote') ?? -1);
    const index = next === previous ? (next + 1) % EDUCATION_QUOTES.length : next;
    sessionStorage.setItem('colourmap:last-education-quote', String(index));
    return EDUCATION_QUOTES[index] ?? EDUCATION_QUOTES[0];
  } catch {
    return EDUCATION_QUOTES[next] ?? EDUCATION_QUOTES[0];
  }
}

/* ── Swim card ───────────────────────────────────────────────── */
function _SwimCard({
  program,
  onOpen,
  startHere,
  cardColor,
}: {
  program: Program;
  onOpen: () => void;
  startHere?: boolean;
  cardColor: string;
}) {
  const c = cardColor;
  const progress = getProgress(program);
  const total = program.segments.length;
  const pct = total > 0 ? progress / total : 0;
  const started = progress > 0;
  const R = 22;
  const circumference = 2 * Math.PI * R;

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        flexShrink: 0,
        width: 136,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        background: col(c, 0.08),
        border: `1px solid ${col(c, started ? 0.35 : 0.2)}`,
        borderRadius: 16,
        cursor: 'pointer',
        padding: '18px 10px 14px',
        boxShadow: started ? `0 0 20px ${col(c, 0.14)}` : 'none',
        position: 'relative',
        transition: 'opacity 0.15s',
      }}
    >
      {/* start here badge */}
      {startHere && !started && (
        <div
          style={{
            position: 'absolute',
            top: -9,
            left: '50%',
            transform: 'translateX(-50%)',
            background: col(c, 0.9),
            borderRadius: 999,
            padding: '2px 10px',
            fontFamily: SERIF,
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(10,6,3,0.9)',
            whiteSpace: 'nowrap',
          }}
        >
          start here
        </div>
      )}

      {/* progress ring */}
      <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
        <svg
          width="52"
          height="52"
          style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
        >
          <circle cx="26" cy="26" r={R} fill="none" stroke={col(c, 0.18)} strokeWidth="2.5" />
          {started && (
            <circle
              cx="26"
              cy="26"
              r={R}
              fill="none"
              stroke={col(c, 0.85)}
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct)}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: c,
              opacity: started ? 0.9 : 0.6,
            }}
          />
        </div>
      </div>

      <div
        style={{
          fontFamily: SERIF,
          fontSize: 12.5,
          fontWeight: 700,
          color: cream(0.88),
          textAlign: 'center',
          lineHeight: 1.35,
        }}
      >
        {program.domain}
      </div>

      <div style={{ fontFamily: SERIF, fontSize: 10, color: col(c, 0.6), letterSpacing: '0.04em' }}>
        {started ? `${progress} / ${total}` : `${total} pages`}
      </div>
    </button>
  );
}

/* ── Hub palettes ────────────────────────────────────────────── */
function ProgramImageCard({
  program,
  onOpen,
  startHere,
  cardColor,
}: {
  program: Program;
  onOpen: () => void;
  startHere?: boolean;
  cardColor: string;
}) {
  const c = cardColor;
  const progress = getProgress(program);
  const total = program.segments.length;
  const started = progress > 0;
  const generatedCount = GENERATED_LAYERED_PANEL_COUNTS[program.key];
  const isPortraitGenerated =
    Boolean(generatedCount) && !LANDSCAPE_GENERATED_COVERS.has(program.key);
  const imageSrc = getProgramCoverSrc(program);
  const imageCrop = getProgramCoverCrop(program);

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        flexShrink: 0,
        width: isPortraitGenerated ? 214 : 176,
        display: 'flex',
        flexDirection: isPortraitGenerated ? 'row' : 'column',
        gap: 8,
        background: col(c, 0.08),
        border: `1px solid ${col(c, started ? 0.35 : 0.2)}`,
        borderRadius: 0,
        cursor: 'pointer',
        padding: isPortraitGenerated ? 7 : 8,
        boxShadow: started ? `0 0 20px ${col(c, 0.14)}` : 'none',
        position: 'relative',
        textAlign: 'left',
      }}
    >
      {startHere && !started && (
        <div
          style={{
            position: 'absolute',
            top: -9,
            left: 12,
            background: col(c, 0.9),
            borderRadius: 999,
            padding: '2px 10px',
            fontFamily: SERIF,
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(10,6,3,0.9)',
            whiteSpace: 'nowrap',
          }}
        >
          start here
        </div>
      )}

      <div
        style={{
          width: isPortraitGenerated ? 74 : '100%',
          height: isPortraitGenerated ? 110 : 104,
          flexShrink: 0,
          overflow: 'hidden',
          background: 'rgba(10,6,3,0.18)',
        }}
      >
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          decoding="async"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: imageCrop.position,
            transform: `scale(${imageCrop.scale})`,
          }}
        />
      </div>

      <div
        style={{
          padding: isPortraitGenerated ? '3px 2px 0' : '2px 2px 0',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isPortraitGenerated ? 'center' : 'flex-start',
        }}
      >
        <div
          style={{
            fontFamily: SERIF,
            fontSize: isPortraitGenerated ? 12.5 : 13.5,
            fontWeight: 700,
            color: cream(0.9),
            lineHeight: isPortraitGenerated ? 1.22 : 1.24,
            overflowWrap: 'anywhere',
          }}
        >
          {program.domain}
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 9.5,
            color: col(c, 0.66),
            letterSpacing: '0.04em',
            marginTop: isPortraitGenerated ? 7 : 5,
          }}
        >
          {started ? `${progress} / ${total}` : `${total} pages`}
        </div>
      </div>
    </button>
  );
}

function GuideProgramCard({
  program,
  onOpen,
  cardColor,
}: {
  program: Program;
  onOpen: () => void;
  cardColor: string;
}) {
  const c = cardColor;
  const progress = getProgress(program);
  const total = program.segments.length;
  const started = progress > 0;
  const imageSrc = getProgramCoverSrc(program);
  const imageCrop = getProgramCoverCrop(program);
  const title = program.domain;
  const subtitle = '';

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        flexShrink: 0,
        width: 142,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: col(c, 0.08),
        border: `1px solid ${col(c, started ? 0.35 : 0.2)}`,
        borderRadius: 0,
        cursor: 'pointer',
        padding: 7,
        boxShadow: started ? `0 0 20px ${col(c, 0.14)}` : 'none',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: '100%',
          height: 158,
          overflow: 'hidden',
          background: 'rgba(10,6,3,0.18)',
        }}
      >
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          decoding="async"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: imageCrop.position,
            transform: `scale(${imageCrop.scale})`,
          }}
        />
      </div>
      <div style={{ minWidth: 0, padding: '1px 1px 0' }}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.12,
            color: cream(0.92),
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              marginTop: 4,
              fontFamily: SERIF,
              fontSize: 10.5,
              lineHeight: 1.18,
              color: col(c, 0.72),
            }}
          >
            {subtitle}
          </div>
        )}
        <div
          style={{
            marginTop: 7,
            fontFamily: SERIF,
            fontSize: 9.5,
            color: col(c, 0.58),
            letterSpacing: '0.04em',
          }}
        >
          {started ? `${progress} / ${total}` : `${total} pages`}
        </div>
      </div>
    </button>
  );
}

function EducationWorldCard({ world, onOpen }: { world: EducationWorld; onOpen: () => void }) {
  function openWorld() {
    onOpen();
    if (world.kind === 'link') window.location.assign(world.href);
  }

  return (
    <button
      type="button"
      onClick={openWorld}
      style={{
        flexShrink: 0,
        width: 142,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 7,
        border: `1px solid ${col(world.tint, 0.28)}`,
        background: col(world.tint, 0.08),
        color: cream(0.88),
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: '100%',
          height: 158,
          overflow: 'hidden',
          background: 'rgba(10,6,3,0.18)',
        }}
      >
        <img
          src={world.cover}
          alt=""
          loading="lazy"
          decoding="async"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: world.coverPosition ?? 'center center',
          }}
        />
      </div>
      <div>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: col(world.tint, 0.78),
            marginBottom: 5,
          }}
        >
          {world.label}
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.12,
            color: cream(0.94),
          }}
        >
          {world.title}
        </div>
      </div>
      <div style={{ fontSize: 10.5, lineHeight: 1.25, color: cream(0.62) }}>{world.body}</div>
    </button>
  );
}

const HUB_PALETTES = [
  { id: 'brown', bg: 'rgba(18,10,4,0.99)', dot: '#3E1A08' },
  { id: 'navy', bg: 'rgba(2,4,14,0.99)', dot: '#0A1830' },
  { id: 'forest', bg: 'rgba(2,6,2,0.99)', dot: '#102010' },
  { id: 'burgundy', bg: 'rgba(10,2,6,0.99)', dot: '#300C18' },
  { id: 'slate', bg: 'rgba(6,8,10,0.99)', dot: '#202830' },
] as const;
type HubPaletteId = (typeof HUB_PALETTES)[number]['id'];
type HubOrganisationMode = 'themes' | 'library';
const HUB_LS = 'colourmap-learn-palette';
function loadHubPalette(): HubPaletteId {
  try {
    return (localStorage.getItem(HUB_LS) ?? 'brown') as HubPaletteId;
  } catch {
    return 'brown';
  }
}
export default function LearningHub({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<Program | null>(null);
  const [personalityOpen, setPersonalityOpen] = useState(false);
  const [hubPalId, setHubPalId] = useState<HubPaletteId>('brown');
  const [organisationMode, setOrganisationMode] = useState<HubOrganisationMode>('themes');
  const [philosophyOpen, setPhilosophyOpen] = useState(false);
  const [educationQuote, setEducationQuote] = useState<(typeof EDUCATION_QUOTES)[number]>(
    EDUCATION_QUOTES[0],
  );
  const hubBg = HUB_PALETTES.find((p) => p.id === hubPalId)?.bg ?? 'rgba(18,10,4,0.99)';
  const [heroImage, setHeroImage] = useState(EDUCATION_IMAGES[0]);

  useEffect(() => {
    setHubPalId(loadHubPalette());
    setEducationQuote(pickEducationQuote());
    setHeroImage(EDUCATION_IMAGES[Math.floor(Math.random() * EDUCATION_IMAGES.length)]);
  }, []);

  function pickPalette(id: HubPaletteId) {
    setHubPalId(id);
    try {
      localStorage.setItem(HUB_LS, id);
    } catch {}
  }

  const byKey = Object.fromEntries(PROGRAMS.map((p) => [p.key, p]));
  const libraryPrograms = useMemo(
    () => [...PROGRAMS].sort((a, b) => a.domain.localeCompare(b.domain)),
    [],
  );

  if (active) {
    if (TRAINER_PROGRAMS.has(active.key)) {
      return (
        <MathTrainer
          program={active}
          onClose={() => setActive(null)}
          onBack={() => setActive(null)}
          hubBg={hubBg}
        />
      );
    }
    if (COMIC_PROGRAMS.has(active.key)) {
      return (
        <ComicProgram
          program={active}
          onClose={() => setActive(null)}
          onBack={() => setActive(null)}
          hubBg={hubBg}
        />
      );
    }
    return (
      <LearningProgram
        program={active}
        onClose={() => setActive(null)}
        onBack={() => setActive(null)}
        hubBg={hubBg}
      />
    );
  }

  if (personalityOpen) {
    return (
      <PersonalityTypeProgram
        onClose={onClose}
        onBack={() => setPersonalityOpen(false)}
        hubBg={hubBg}
      />
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        justifyContent: 'center',
        background: 'rgba(4,2,0,0.6)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 672,
          background: hubBg,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Hero image */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            minHeight: 160,
            flexShrink: 0,
            overflow: 'visible',
            background: 'rgba(10,6,3,0.2)',
          }}
        >
          <img
            src={heroImage}
            alt=""
            fetchPriority="high"
            decoding="async"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to bottom, transparent 40%, ${hubBg}88 100%)`,
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Title below image */}
        <div style={{ textAlign: 'center', padding: '18px 20px 0', flexShrink: 0 }}>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: och(0.4),
              marginBottom: 4,
            }}
          >
            Colourmap
          </div>
          <button
            type="button"
            onClick={() => setPhilosophyOpen((value) => !value)}
            aria-expanded={philosophyOpen}
            style={{
              fontFamily: SERIF,
              fontSize: 32,
              fontWeight: 700,
              color: cream(0.92),
              letterSpacing: '-0.02em',
              lineHeight: 1,
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Education
          </button>
          {philosophyOpen && (
            <p
              style={{
                maxWidth: 520,
                margin: '12px auto 0',
                color: cream(0.68),
                fontFamily: SERIF,
                fontSize: 13.5,
                lineHeight: 1.65,
              }}
            >
              Life is not fixed. You can understand your patterns, organise your energy, transform
              yourself, and participate in transforming the world.
            </p>
          )}
          <figure
            style={{
              maxWidth: 560,
              margin: '18px auto 0',
              textAlign: 'center',
            }}
          >
            <blockquote
              style={{
                margin: 0,
                color: cream(0.88),
                fontFamily: SERIF,
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.55,
              }}
            >
              {educationQuote.text}
            </blockquote>
            <figcaption
              style={{
                marginTop: 7,
                color: och(0.62),
                fontFamily: SERIF,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {educationQuote.by}
            </figcaption>
          </figure>
        </div>

        {/* Header — palette + close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            borderBottom: `1px solid ${och(0.12)}`,
            flexShrink: 0,
          }}
        >
          <div aria-hidden="true" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {HUB_PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickPalette(p.id)}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: p.dot,
                    border:
                      hubPalId === p.id
                        ? '1.5px solid rgba(196,160,96,0.8)'
                        : '1px solid rgba(196,160,96,0.2)',
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: `1px solid ${och(0.22)}`,
                borderRadius: 999,
                color: och(0.45),
                fontFamily: SERIF,
                fontSize: 11,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                padding: '5px 14px',
              }}
            >
              close
            </button>
          </div>
        </div>

        {/* Programs — swim lanes with group tints */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            padding: '12px 20px 0',
            flexShrink: 0,
          }}
        >
          {(
            [
              { id: 'themes', label: 'Themes' },
              { id: 'library', label: 'A-Z Library' },
            ] as const
          ).map((mode) => {
            const activeMode = organisationMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setOrganisationMode(mode.id)}
                aria-pressed={activeMode}
                style={{
                  border: `1px solid ${activeMode ? och(0.44) : och(0.18)}`,
                  borderRadius: 999,
                  background: activeMode ? och(0.13) : 'transparent',
                  color: activeMode ? cream(0.88) : och(0.56),
                  cursor: 'pointer',
                  fontFamily: SERIF,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  padding: '6px 14px',
                  textTransform: 'uppercase',
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0 40px' }}>
          {organisationMode === 'themes' ? (
            GROUPS.map((group) => {
              const programs = group.keys.map((k) => byKey[k]).filter(Boolean);
              if (!programs.length) return null;
              return (
                <div key={group.label} style={{ marginBottom: 32 }}>
                  {/* group label */}
                  <div style={{ paddingLeft: 20, marginBottom: 14 }}>
                    <div
                      style={{
                        fontFamily: SERIF,
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: col(group.tint, 0.75),
                      }}
                    >
                      {group.label}
                    </div>
                  </div>

                  {/* horizontal scroll lane */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      overflowX: 'auto',
                      paddingLeft: 20,
                      paddingRight: 20,
                      paddingBottom: 6,
                      scrollbarWidth: 'none',
                    }}
                  >
                    {programs.map((p, i) =>
                      group.format === 'guides' ? (
                        <GuideProgramCard
                          key={p.key}
                          program={p}
                          onOpen={() => setActive(p)}
                          cardColor={progressionColor(group.tint, i, programs.length)}
                        />
                      ) : (
                        <ProgramImageCard
                          key={p.key}
                          program={p}
                          onOpen={() => setActive(p)}
                          startHere={group.startHere === p.key}
                          cardColor={progressionColor(group.tint, i, programs.length)}
                        />
                      ),
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ marginBottom: 32 }}>
              <div style={{ paddingLeft: 20, paddingRight: 20, marginBottom: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      fontFamily: SERIF,
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: och(0.68),
                    }}
                  >
                    A-Z Library
                  </div>
                  <div
                    style={{
                      color: och(0.48),
                      fontFamily: SERIF,
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {libraryPrograms.length} programs
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  paddingLeft: 20,
                  paddingRight: 20,
                }}
              >
                {libraryPrograms.map((program, i) => (
                  <GuideProgramCard
                    key={program.key}
                    program={program}
                    onOpen={() => setActive(program)}
                    cardColor={progressionColor('#C4A060', i, libraryPrograms.length)}
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 32 }}>
            <div style={{ paddingLeft: 20, marginBottom: 14 }}>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: och(0.68),
                }}
              >
                Entertainment
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                paddingLeft: 20,
                paddingRight: 20,
                paddingBottom: 6,
                scrollbarWidth: 'none',
              }}
            >
              {EDUCATION_ENTERTAINMENT.map((world) => (
                <EducationWorldCard
                  key={world.href}
                  world={world}
                  onOpen={() => {
                    if (world.kind === 'program') {
                      const program = byKey[world.programKey ?? ''];
                      if (program) setActive(program);
                    } else {
                      onClose();
                    }
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ paddingLeft: 20, marginBottom: 14 }}>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: och(0.68),
                }}
              >
                Knowledge worlds
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                paddingLeft: 20,
                paddingRight: 20,
                paddingBottom: 6,
                scrollbarWidth: 'none',
              }}
            >
              {EDUCATION_WORLDS.map((world) => (
                <EducationWorldCard
                  key={world.href}
                  world={world}
                  onOpen={() => {
                    if (world.kind === 'personality') setPersonalityOpen(true);
                    else if (world.kind === 'program') {
                      const program = byKey[world.programKey ?? ''];
                      if (program) setActive(program);
                    } else onClose();
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
