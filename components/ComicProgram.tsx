'use client';

import Image from 'next/image';
import type { MouseEvent } from 'react';
import { useState } from 'react';
import { getProgramReferences } from '@/lib/program-references';
import type { Program } from '@/lib/programs';

const SERIF = 'var(--font-serif)';
const cream = (a: number) => `rgba(240,216,152,${a})`;
const TEXT_SIZE_OPTIONS = [
  { label: 'A', value: 0 },
  { label: 'A+', value: 2 },
  { label: 'A++', value: 4 },
] as const;

type ImageStyle = {
  key: string;
  label: string;
};

const DEFAULT_IMAGE_STYLE: ImageStyle = { key: 'default', label: 'Warm paper' };
const POSITIVE_OVERLAY_STYLE: ImageStyle = { key: 'positive-overlay', label: 'Positive' };

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

const TEXT_ON_IMAGE_PROGRAMS = new Set([
  'colourmap-vision-comic',
  'agency',
  'creativity',
  'deep-attention',
  'identity-becoming',
]);

const BLANK_BUBBLE_PROGRAMS = new Set(['carl-jung']);
const LAYERED_BUBBLE_PROGRAMS = new Set([
  'carl-jung',
  'paulo-freire',
  'thich-nhat-hanh',
  'gandhi',
  'clear-allen',
]);
const LANDSCAPE_LAYERED_PROGRAMS = new Set(['thich-nhat-hanh']);
const LIFE_GUIDE_PROGRAMS = new Set([
  'carl-jung',
  'paulo-freire',
  'thich-nhat-hanh',
  'gandhi',
  'clear-allen',
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

const POSITIVE_OVERLAY_PANEL_COUNTS: Record<string, number> = {
  'conflict-repair': 7,
  'money-anxiety': 7,
  'signal-vs-noise': 7,
  'finding-your-place': 8,
  'art-of-trying': 10,
  'identity-becoming': 7,
  'avoidance-action': 1,
  'parenting-patterns': 7,
  'viktor-frankl': 12,
  'bukowski-poems': 10,
  'jack-london': 12,
  'jules-verne': 12,
  'maya-angelou': 8,
  'plato-cave': 7,
  'alan-watts': 8,
  'david-hawkins': 8,
  nietzsche: 8,
  'campbell-hero-quest': 7,
  'economic-systems': 40,
  'planetary-ecology': 40,
  'future-transitions': 32,
};

const SINGLE_RASTER_PROGRAMS = new Set([
  'viktor-frankl',
  'bukowski-poems',
  'signal-vs-noise',
  'finding-your-place',
  'art-of-trying',
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

const PROGRAM_IMAGE_STYLES: Record<string, ImageStyle[]> = {
  'hope-energy': [DEFAULT_IMAGE_STYLE, { key: 'euro-bd', label: 'European BD' }],
  'emotional-intelligence': [DEFAULT_IMAGE_STYLE, { key: 'minimal', label: 'Minimal' }],
};

const THREE_PART_GUIDES = new Set(['carl-jung', 'gandhi']);
const GUIDE_PARTS = [
  { label: 'Part 1', start: 0, end: 5 },
  { label: 'Part 2', start: 6, end: 12 },
  { label: 'Part 3', start: 13, end: 19 },
];

const JUNG_PART_REFLECTIONS: Record<number, { label: string; questions: string[] }> = {
  5: {
    label: 'End of Part 1',
    questions: [
      'What inner signal keeps returning in your life?',
      'Which hidden part of you may be asking to be included?',
    ],
  },
  12: {
    label: 'End of Part 2',
    questions: [
      'Which dream, image, coincidence, or reaction has carried more meaning than logic could explain?',
      'What would change if you treated it as information instead of noise?',
    ],
  },
  19: {
    label: 'End of Part 3',
    questions: [
      'Where does your life feel scattered, and what center could help the parts gather?',
      'What rejected energy could become wisdom if it was welcomed carefully?',
    ],
  },
};

function guideReflectionPrompts(programKey: string, index: number): string[] {
  if (programKey !== 'carl-jung') return [];
  const reflection = JUNG_PART_REFLECTIONS[index];
  if (!reflection) return [];
  return [reflection.label, ...reflection.questions];
}

function complementaryJungText(title: string, body: string, reflectionPrompts: string[]): string[] {
  const concise = conciseLesson(body);
  const remaining = body.replace(concise, '').trim();
  const complement =
    remaining ||
    `Look at this image as a second door into ${title.toLowerCase()}. What does it reveal that the first image did not?`;
  if (reflectionPrompts.length === 0) return [complement];
  return [complement, ...reflectionPrompts];
}

function getImageStyles(programKey: string): ImageStyle[] {
  if (SINGLE_RASTER_PROGRAMS.has(programKey)) return [POSITIVE_OVERLAY_STYLE];
  const styles = PROGRAM_IMAGE_STYLES[programKey] ?? [DEFAULT_IMAGE_STYLE];
  if (!POSITIVE_OVERLAY_PROGRAMS.has(programKey)) return styles;
  if (styles.some((style) => style.key === POSITIVE_OVERLAY_STYLE.key)) return styles;
  return [POSITIVE_OVERLAY_STYLE, ...styles];
}

function col(color: string, a: number) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function hex2rgb(color: string) {
  return {
    r: parseInt(color.slice(1, 3), 16),
    g: parseInt(color.slice(3, 5), 16),
    b: parseInt(color.slice(5, 7), 16),
  };
}

function toParagraphs(text: string): string[] {
  if (text.includes('\n\n')) return text.split('\n\n').filter(Boolean);
  const sentences = text.match(/[^.!?]+[.!?]+["']?/g) ?? [text];
  const paras: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paras.push(
      sentences
        .slice(i, i + 2)
        .join(' ')
        .trim(),
    );
  }
  return paras.filter(Boolean);
}

function conciseLesson(text: string) {
  const sentences = text.match(/[^.!?]+[.!?]/g) ?? [text];
  return sentences.slice(0, 2).join(' ').trim();
}

/* ── Generative panel art — one composition per segment index ── */
function PanelArt({ index, color }: { index: number; color: string }) {
  const { r, g, b } = hex2rgb(color);
  const c = `rgb(${r},${g},${b})`;
  const cm = `rgba(${r},${g},${b}`;

  const scenes = [
    /* 0 — Signal : concentric rings emanating from heart */
    <svg
      key={0}
      viewBox="0 0 400 260"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect
        width="400"
        height="260"
        fill={`rgb(${Math.max(r - 60, 0)},${Math.max(g - 60, 0)},${Math.max(b - 60, 0)})`}
      />
      <rect width="400" height="260" fill="black" opacity="0.55" />
      {[180, 140, 100, 62, 32].map((radius, i) => (
        <circle
          key={i}
          cx="200"
          cy="130"
          r={radius}
          fill="none"
          stroke={c}
          strokeWidth={i === 4 ? 2 : 1}
          opacity={[0.08, 0.12, 0.18, 0.32, 0.75][i]}
        />
      ))}
      <circle cx="200" cy="130" r="10" fill={c} opacity="0.9" />
      <line x1="200" y1="0" x2="200" y2="260" stroke={c} strokeWidth="0.5" opacity="0.07" />
      <line x1="0" y1="130" x2="400" y2="130" stroke={c} strokeWidth="0.5" opacity="0.07" />
    </svg>,

    /* 1 — Three layers : sensation / thought / impulse */
    <svg
      key={1}
      viewBox="0 0 400 260"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="400" height="260" fill="black" />
      <ellipse cx="160" cy="130" rx="110" ry="80" fill={`${cm},0.18)`} stroke={c} strokeWidth="1" />
      <ellipse cx="200" cy="130" rx="110" ry="80" fill={`${cm},0.14)`} stroke={c} strokeWidth="1" />
      <ellipse cx="240" cy="130" rx="110" ry="80" fill={`${cm},0.18)`} stroke={c} strokeWidth="1" />
      {/* intersection labels */}
      <text
        x="120"
        y="134"
        textAnchor="middle"
        fontFamily="serif"
        fontSize="9"
        fill={c}
        opacity="0.55"
      >
        sensation
      </text>
      <text
        x="200"
        y="110"
        textAnchor="middle"
        fontFamily="serif"
        fontSize="9"
        fill={c}
        opacity="0.75"
      >
        thought
      </text>
      <text
        x="280"
        y="134"
        textAnchor="middle"
        fontFamily="serif"
        fontSize="9"
        fill={c}
        opacity="0.55"
      >
        impulse
      </text>
    </svg>,

    /* 2 — Label : precise word emerging from fog */
    <svg
      key={2}
      viewBox="0 0 400 260"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="fog2" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={c} stopOpacity="0.22" />
          <stop offset="100%" stopColor="black" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill="black" />
      <rect width="400" height="260" fill="url(#fog2)" />
      {/* blurred word fragments */}
      {['anxious', 'unsure', 'heavy', 'lost', 'afraid'].map((word, i) => (
        <text
          key={i}
          x={50 + i * 70}
          y={80 + (i % 3) * 40}
          fontFamily="serif"
          fontSize="11"
          fill={c}
          opacity={0.08 + i * 0.04}
          transform={`rotate(${-8 + i * 4}, ${80 + i * 70}, ${80 + (i % 3) * 40})`}
        >
          {word}
        </text>
      ))}
      {/* sharp label */}
      <rect
        x="130"
        y="105"
        width="140"
        height="38"
        rx="3"
        fill="none"
        stroke={c}
        strokeWidth="1.5"
        opacity="0.8"
      />
      <text
        x="200"
        y="129"
        textAnchor="middle"
        fontFamily="serif"
        fontSize="16"
        fontWeight="bold"
        fill={c}
        opacity="0.95"
      >
        shame
      </text>
    </svg>,

    /* 3 — Scale : vertical spectrum of states */
    <svg
      key={3}
      viewBox="0 0 400 260"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="scale3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.9" />
          <stop offset="50%" stopColor={c} stopOpacity="0.35" />
          <stop offset="100%" stopColor="black" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="black" />
      <rect x="194" y="20" width="12" height="220" rx="6" fill="url(#scale3)" />
      {[
        { y: 30, label: 'peace', op: 0.9 },
        { y: 68, label: 'joy', op: 0.8 },
        { y: 106, label: 'courage', op: 0.65 },
        { y: 144, label: 'anger', op: 0.45 },
        { y: 182, label: 'fear', op: 0.3 },
        { y: 220, label: 'shame', op: 0.18 },
      ].map(({ y, label, op }) => (
        <g key={label}>
          <line x1="206" y1={y} x2="224" y2={y} stroke={c} strokeWidth="1" opacity={op} />
          <text x="228" y={y + 4} fontFamily="serif" fontSize="10" fill={c} opacity={op}>
            {label}
          </text>
        </g>
      ))}
    </svg>,

    /* 4 — Decision fork : emotion colours the path */
    <svg
      key={4}
      viewBox="0 0 400 260"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="400" height="260" fill="black" />
      {/* stem */}
      <line x1="200" y1="240" x2="200" y2="140" stroke={c} strokeWidth="2" opacity="0.6" />
      {/* branches */}
      <path d="M200,140 Q160,110 120,80" fill="none" stroke={c} strokeWidth="1.5" opacity="0.7" />
      <path d="M200,140 Q240,110 280,80" fill="none" stroke={c} strokeWidth="1.5" opacity="0.7" />
      <path
        d="M200,140 Q200,110 200,80"
        fill="none"
        stroke={c}
        strokeWidth="1"
        opacity="0.35"
        strokeDasharray="4 3"
      />
      {/* emotion cloud */}
      <circle
        cx="200"
        cy="160"
        r="28"
        fill={`${cm},0.12)`}
        stroke={c}
        strokeWidth="1"
        opacity="0.5"
      />
      <text
        x="200"
        y="164"
        textAnchor="middle"
        fontFamily="serif"
        fontSize="9"
        fill={c}
        opacity="0.75"
      >
        emotion
      </text>
      {/* endpoints */}
      <circle cx="120" cy="78" r="5" fill={c} opacity="0.7" />
      <circle cx="280" cy="78" r="5" fill={c} opacity="0.7" />
      <circle cx="200" cy="78" r="3" fill={c} opacity="0.3" />
    </svg>,

    /* 5 — Resilience weave : three interlocking threads */
    <svg
      key={5}
      viewBox="0 0 400 260"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="400" height="260" fill="black" />
      {/* three woven paths */}
      <path
        d="M0,100 C80,60 160,160 240,100 S360,60 400,100"
        fill="none"
        stroke={c}
        strokeWidth="1.5"
        opacity="0.7"
      />
      <path
        d="M0,130 C80,170 160,90 240,130 S360,170 400,130"
        fill="none"
        stroke={c}
        strokeWidth="1.5"
        opacity="0.5"
      />
      <path
        d="M0,160 C80,120 160,200 240,160 S360,120 400,160"
        fill="none"
        stroke={c}
        strokeWidth="1"
        opacity="0.35"
      />
      {/* anchor points */}
      {[0, 80, 160, 240, 320, 400].map((x, i) => (
        <circle key={i} cx={x} cy={130} r="2.5" fill={c} opacity="0.4" />
      ))}
      {/* label */}
      <text
        x="200"
        y="228"
        textAnchor="middle"
        fontFamily="serif"
        fontSize="10"
        fontStyle="italic"
        fill={c}
        opacity="0.45"
      >
        meaning · agency · connection
      </text>
    </svg>,
  ];

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {scenes[index % scenes.length]}
    </div>
  );
}

/* ── Panel image — real file if exists, SVG art fallback ───────── */
function ColourmapVisionPanel({ index, color }: { index: number; color: string }) {
  const { r, g, b } = hex2rgb(color);
  const c = `rgb(${r},${g},${b})`;
  const gold = '#D6A64F';
  const paper = '#E8D5AE';
  const nodes = [
    [450, 190],
    [210, 390],
    [690, 390],
    [300, 680],
    [600, 680],
    [450, 900],
  ];

  return (
    <svg viewBox="0 0 900 1280" width="100%" height="100%" role="img">
      <defs>
        <linearGradient id={`visionSky${index}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={index % 2 === 0 ? '#182c3d' : '#071018'} />
          <stop offset="55%" stopColor={index % 2 === 0 ? '#6f8fa3' : '#132b38'} />
          <stop offset="100%" stopColor="#17100b" />
        </linearGradient>
        <radialGradient id={`visionGlow${index}`} cx="50%" cy="42%" r="54%">
          <stop offset="0%" stopColor={c} stopOpacity="0.42" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="900" height="1280" fill={`url(#visionSky${index})`} />
      <rect width="900" height="1280" fill={`url(#visionGlow${index})`} />
      <path
        d="M0 650 C160 590 268 560 390 608 C548 670 650 560 900 500 L900 1280 L0 1280 Z"
        fill="#172a2f"
        opacity="0.66"
      />
      <path
        d="M0 850 C180 790 330 838 470 770 C610 704 720 790 900 708 L900 1280 L0 1280 Z"
        fill="#241a10"
        opacity="0.54"
      />

      {index === 0 && (
        <g>
          <rect
            x="66"
            y="90"
            width="768"
            height="520"
            rx="18"
            fill="rgba(232,244,246,0.1)"
            stroke="rgba(232,244,246,0.28)"
          />
          {[0, 1, 2, 3, 4].map((item) => (
            <g key={item} transform={`translate(${128 + item * 132} 178)`}>
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="rgba(255,255,255,0.07)"
                stroke={item === 3 ? gold : 'rgba(232,213,174,0.36)'}
                strokeWidth={item === 3 ? 3 : 1.3}
              />
              <rect
                x="0"
                y="104"
                width="80"
                height="148"
                rx="10"
                fill={item === 3 ? 'rgba(214,166,79,0.24)' : 'rgba(255,255,255,0.08)'}
                stroke={item === 3 ? gold : 'rgba(255,255,255,0.16)'}
              />
              <circle cx="40" cy="178" r="18" fill={item === 3 ? gold : c} opacity="0.72" />
            </g>
          ))}
        </g>
      )}

      {index === 1 && (
        <g>
          {[170, 260, 350, 440].map((radius) => (
            <circle
              key={radius}
              cx="450"
              cy="545"
              r={radius}
              fill="none"
              stroke="rgba(232,213,174,0.16)"
              strokeWidth="2"
            />
          ))}
          <line x1="450" y1="105" x2="450" y2="990" stroke={gold} strokeWidth="2" opacity="0.5" />
          <line x1="100" y1="545" x2="800" y2="545" stroke={gold} strokeWidth="2" opacity="0.5" />
          {nodes.map(([x, y], item) => (
            <g key={item}>
              <line x1="450" y1="545" x2={x} y2={y} stroke={item % 2 ? gold : c} opacity="0.35" />
              <circle
                cx={x}
                cy={y}
                r="54"
                fill={item % 2 ? 'rgba(214,166,79,0.2)' : `rgba(${r},${g},${b},0.18)`}
                stroke={item % 2 ? gold : c}
                strokeWidth="3"
              />
              <circle cx={x} cy={y} r="14" fill={item % 2 ? gold : c} opacity="0.72" />
            </g>
          ))}
          <circle
            cx="450"
            cy="545"
            r="70"
            fill="rgba(232,213,174,0.16)"
            stroke={paper}
            strokeWidth="3"
          />
        </g>
      )}

      {index === 2 && (
        <g>
          <circle
            cx="450"
            cy="515"
            r="340"
            fill="rgba(120,169,184,0.08)"
            stroke="rgba(232,213,174,0.18)"
          />
          {Array.from({ length: 34 }).map((_, item) => {
            const angle = item * 0.74;
            const ring = 160 + (item % 4) * 54;
            const x = 450 + Math.cos(angle) * ring;
            const y = 515 + Math.sin(angle) * ring;
            return (
              <g key={item}>
                <line
                  x1="450"
                  y1="515"
                  x2={x}
                  y2={y}
                  stroke={item % 5 === 0 ? gold : c}
                  opacity="0.14"
                />
                <rect
                  x={x - 26}
                  y={y - 34}
                  width="52"
                  height="68"
                  rx="7"
                  fill={item % 5 === 0 ? 'rgba(214,166,79,0.2)' : `rgba(${r},${g},${b},0.14)`}
                  stroke={item % 5 === 0 ? gold : c}
                />
                <circle cx={x} cy={y} r="8" fill={item % 5 === 0 ? gold : c} opacity="0.62" />
              </g>
            );
          })}
          <circle
            cx="450"
            cy="515"
            r="82"
            fill="rgba(232,213,174,0.14)"
            stroke={paper}
            strokeWidth="3"
          />
        </g>
      )}

      {index >= 3 && (
        <g>
          {[0, 1, 2, 3, 4].map((row) =>
            [0, 1, 2, 3].map((colIndex) => (
              <g
                key={`${row}-${colIndex}`}
                transform={`translate(${132 + colIndex * 168} ${250 + row * 118})`}
              >
                <rect
                  width="112"
                  height="76"
                  rx="12"
                  fill={`rgba(${r},${g},${b},0.11)`}
                  stroke={`rgba(${r},${g},${b},0.34)`}
                />
                <circle
                  cx="56"
                  cy="38"
                  r="16"
                  fill={(row + colIndex) % 3 === 0 ? gold : c}
                  opacity="0.58"
                />
                {colIndex < 3 && (
                  <path
                    d="M112 38 C132 24 148 52 168 38"
                    stroke="rgba(232,213,174,0.28)"
                    strokeWidth="2"
                    fill="none"
                  />
                )}
              </g>
            )),
          )}
          <path
            d="M170 940 C272 862 360 1014 468 920 C590 814 690 976 796 890"
            stroke={index === 4 ? gold : c}
            strokeWidth="5"
            fill="none"
            opacity="0.62"
          />
          <circle
            cx="450"
            cy="1034"
            r="44"
            fill="rgba(232,213,174,0.12)"
            stroke={paper}
            strokeWidth="3"
          />
          <circle cx="450" cy="1034" r="18" fill={gold} opacity="0.82" />
        </g>
      )}
    </svg>
  );
}

function ColourmapVisionRasterPanel({
  index,
  color,
  alt,
}: {
  index: number;
  color: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <ColourmapVisionPanel index={index} color={color} />;
  }

  return (
    <Image
      src={`/comics/colourmap-vision-comic/panel-${index}.webp`}
      alt={alt}
      width={1200}
      height={1800}
      quality={75}
      sizes="(max-width: 720px) 92vw, 760px"
      loading={index === 0 ? 'eager' : 'lazy'}
      priority={index === 0}
      onError={() => setFailed(true)}
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        background: 'rgba(10,6,3,0.24)',
      }}
    />
  );
}

function PanelImage({
  programKey,
  index,
  color,
  imageStyle,
  alt = '',
}: {
  programKey: string;
  index: number;
  color: string;
  imageStyle?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  const generatedCount = GENERATED_LAYERED_PANEL_COUNTS[programKey];
  if (programKey === 'colourmap-vision-comic') {
    if (index < 9) {
      return <ColourmapVisionRasterPanel index={index} color={color} alt={alt} />;
    }
    return <ColourmapVisionPanel index={index} color={color} />;
  }
  if (imageStyle && imageStyle !== 'default' && !failed) {
    const extension =
      imageStyle === POSITIVE_OVERLAY_STYLE.key
        ? (POSITIVE_OVERLAY_PANEL_EXTENSIONS[programKey] ?? 'jpg')
        : 'jpg';
    return (
      <img
        src={`/comics/${programKey}/variants/${imageStyle}/panel-${
          index % (POSITIVE_OVERLAY_PANEL_COUNTS[programKey] ?? Number.POSITIVE_INFINITY)
        }.${extension}`}
        alt={alt}
        loading={index === 0 ? 'eager' : 'lazy'}
        fetchPriority={index === 0 ? 'high' : 'auto'}
        decoding="async"
        onError={() => setFailed(true)}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          background: 'rgba(10,6,3,0.24)',
        }}
      />
    );
  }
  if (generatedCount && !failed) {
    const extension = GENERATED_LAYERED_PANEL_EXTENSIONS[programKey] ?? 'jpg';
    return (
      <img
        src={`/comics/${programKey}/generated/panel-${index % generatedCount}.${extension}`}
        alt={alt}
        loading={index === 0 ? 'eager' : 'lazy'}
        fetchPriority={index === 0 ? 'high' : 'auto'}
        decoding="async"
        onError={() => setFailed(true)}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          background: 'rgba(10,6,3,0.24)',
        }}
      />
    );
  }
  if (programKey === 'thich-nhat-hanh') {
    return <ThichBasePanel index={index} color={color} />;
  }
  if (programKey === 'paulo-freire') {
    return <FreireBasePanel index={index} color={color} />;
  }
  if (programKey === 'carl-jung') {
    return <CarlJungBasePanel index={index} color={color} />;
  }
  const extension = 'jpg';
  const src = `/comics/${programKey}/panel-${index}.${extension}`;
  if (!failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading={index === 0 ? 'eager' : 'lazy'}
        fetchPriority={index === 0 ? 'high' : 'auto'}
        decoding="async"
        onError={() => setFailed(true)}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          background: 'rgba(10,6,3,0.24)',
        }}
      />
    );
  }
  return <PanelArt index={index} color={color} />;
}

function FreireBasePanel({ index, color }: { index: number; color: string }) {
  const scenes = [
    { path: 'M44 418 C112 360, 181 382, 258 330 C320 289, 352 244, 389 196', sun: [334, 132] },
    { path: 'M34 384 C98 330, 164 330, 222 288 C282 245, 332 218, 398 214', sun: [300, 128] },
    { path: 'M40 430 C98 374, 150 368, 214 334 C289 294, 338 248, 408 226', sun: [330, 154] },
    { path: 'M34 398 C92 356, 150 386, 220 328 C286 274, 338 256, 400 214', sun: [322, 132] },
  ];
  const scene = scenes[index % scenes.length];
  const people = [
    { x: 86, y: 402, scale: 1.04, tone: '#5C3018', shape: 'dress' },
    { x: 136, y: 384, scale: 0.94, tone: '#6b4429', shape: 'coat' },
    { x: 190, y: 400, scale: 1.08, tone: '#50301f', shape: 'wide' },
    { x: 246, y: 372, scale: 0.9, tone: '#7a5438', shape: 'dress' },
    { x: 300, y: 346, scale: 1.02, tone: '#573621', shape: 'coat' },
    { x: 342, y: 368, scale: 0.82, tone: '#66503a', shape: 'dress' },
  ];

  return (
    <svg
      viewBox="0 0 430 620"
      role="img"
      aria-label={`Paulo Freire symbolic comic panel ${index + 1}`}
      style={{ display: 'block', width: '100%', height: 'auto', background: '#20120c' }}
    >
      <defs>
        <radialGradient id={`freire-sun-${index}`} cx="70%" cy="22%" r="54%">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ead8b4" stopOpacity="0" />
        </radialGradient>
        <filter id={`freire-grain-${index}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed={index + 21} />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.08" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="430" height="620" fill="#ead8b4" />
      <rect width="430" height="620" fill={`url(#freire-sun-${index})`} />
      <rect width="430" height="620" filter={`url(#freire-grain-${index})`} />

      <g opacity="0.12" stroke="#5C3018" strokeWidth="1.2" fill="none">
        <path d="M42 72h152M42 94h102" />
        <path d="M270 470h94M286 496h70" />
        <circle cx={scene.sun[0]} cy={scene.sun[1]} r="54" />
        <circle cx={scene.sun[0]} cy={scene.sun[1]} r="86" />
      </g>

      <path d={scene.path} fill="none" stroke="#5C3018" strokeWidth="4" opacity="0.18" />
      <path
        d={scene.path}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.32"
      />

      <g opacity="0.4">
        <path
          d="M60 512 C108 476, 159 500, 205 468 C263 428, 306 444, 370 402"
          fill="none"
          stroke="#6B7A50"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M78 532 C126 510, 169 528, 224 496 C281 464, 318 472, 384 438"
          fill="none"
          stroke="#6888B0"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>

      {people.map((person) => (
        <g
          key={`${person.x}-${person.y}`}
          transform={`translate(${person.x} ${person.y}) scale(${person.scale})`}
        >
          <circle cx="0" cy="-32" r="12" fill="#f7e8c8" stroke={person.tone} strokeWidth="2" />
          {person.shape === 'dress' ? (
            <path
              d="M-16 4 L0 -20 L16 4 L10 42 H-10 Z"
              fill="none"
              stroke={person.tone}
              strokeWidth="3"
            />
          ) : person.shape === 'wide' ? (
            <path
              d="M-20 -17 C-10 -3, 10 -3, 20 -17 M-15 -8 V40 M15 -8 V40"
              fill="none"
              stroke={person.tone}
              strokeWidth="3"
            />
          ) : (
            <path
              d="M0 -20 V42 M-18 -6 H18 M-11 42 L-22 68 M11 42 L22 68"
              fill="none"
              stroke={person.tone}
              strokeWidth="3"
            />
          )}
        </g>
      ))}

      <g fill={color} opacity="0.55">
        <circle cx="86" cy="274" r="4" />
        <circle cx="146" cy="250" r="4" />
        <circle cx="220" cy="232" r="4" />
        <circle cx="284" cy="196" r="4" />
      </g>
    </svg>
  );
}

function ThichBasePanel({ index, color }: { index: number; color: string }) {
  const scenes = [
    {
      sun: [116, 82],
      river: 'M0 258 C120 220, 212 288, 344 246 S548 208, 640 238',
      tree: [488, 222],
    },
    {
      sun: [524, 74],
      river: 'M0 244 C92 214, 176 236, 266 214 S430 160, 640 190',
      tree: [146, 220],
    },
    {
      sun: [326, 78],
      river: 'M0 274 C108 230, 222 256, 328 230 S514 212, 640 248',
      tree: [520, 204],
    },
    {
      sun: [92, 96],
      river: 'M0 232 C132 206, 230 226, 336 198 S512 168, 640 202',
      tree: [300, 214],
    },
  ];
  const scene = scenes[index % scenes.length];
  const people = [
    { x: 170, y: 238, scale: 0.85, tone: '#5C3018', shape: 'dress' },
    { x: 218, y: 246, scale: 0.74, tone: '#6B7A50', shape: 'coat' },
    { x: 430, y: 232, scale: 0.78, tone: '#7A5438', shape: 'wide' },
    { x: 474, y: 244, scale: 0.7, tone: '#4f3a2b', shape: 'dress' },
  ];

  return (
    <svg
      viewBox="0 0 640 360"
      role="img"
      aria-label={`Thich Nhat Hanh landscape comic panel ${index + 1}`}
      style={{ display: 'block', width: '100%', height: 'auto', background: '#ead8b4' }}
    >
      <defs>
        <linearGradient id={`thich-sky-${index}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2dfba" />
          <stop offset="100%" stopColor="#d9c190" />
        </linearGradient>
        <radialGradient id={`thich-light-${index}`} cx="50%" cy="22%" r="68%">
          <stop offset="0%" stopColor={color} stopOpacity="0.34" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <filter id={`thich-grain-${index}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="2" seed={index + 44} />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.06" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="640" height="360" fill={`url(#thich-sky-${index})`} />
      <rect width="640" height="360" fill={`url(#thich-light-${index})`} />
      <rect width="640" height="360" filter={`url(#thich-grain-${index})`} />

      <g opacity="0.16" stroke="#5C3018" strokeWidth="1" fill="none">
        <circle cx={scene.sun[0]} cy={scene.sun[1]} r="32" />
        <circle cx={scene.sun[0]} cy={scene.sun[1]} r="56" />
        <path d="M54 78h118M466 302h92" />
      </g>

      <g fill="none" strokeLinecap="round">
        <path
          d="M0 236 C110 190, 200 210, 286 188 S498 142, 640 166"
          stroke="#6B7A50"
          strokeWidth="18"
          opacity="0.14"
        />
        <path d={scene.river} stroke="#6888B0" strokeWidth="20" opacity="0.22" />
        <path d={scene.river} stroke="#fff7dc" strokeWidth="4" opacity="0.42" />
        <path
          d="M0 310 C150 294, 256 330, 410 296 S568 284, 640 306"
          stroke="#5C3018"
          strokeWidth="2"
          opacity="0.13"
        />
      </g>

      <g transform={`translate(${scene.tree[0]} ${scene.tree[1]})`}>
        <path
          d="M0 52 V-28"
          stroke="#5C3018"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.72"
        />
        <path
          d="M0 -12 C-34 -44, -70 -22, -62 10 C-30 12, -18 0, 0 -12Z"
          fill="#6B7A50"
          opacity="0.45"
        />
        <path d="M0 -18 C34 -56, 78 -28, 66 8 C36 14, 18 2, 0 -18Z" fill="#7A8A50" opacity="0.5" />
        <path
          d="M0 -34 C-18 -70, 28 -78, 42 -42 C30 -20, 16 -26, 0 -34Z"
          fill={color}
          opacity="0.26"
        />
      </g>

      {people.map((person) => (
        <g
          key={`${person.x}-${person.y}`}
          transform={`translate(${person.x} ${person.y}) scale(${person.scale})`}
        >
          <circle cx="0" cy="-24" r="10" fill="#f7e8c8" stroke={person.tone} strokeWidth="2" />
          {person.shape === 'dress' ? (
            <path
              d="M-14 34 L0 -12 L14 34 M-10 34 L-16 54 M10 34 L16 54"
              fill="none"
              stroke={person.tone}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : person.shape === 'wide' ? (
            <path
              d="M-17 -2 C-8 8, 8 8, 17 -2 M-12 6 V34 M12 6 V34 M-8 34 L-18 54 M8 34 L18 54"
              fill="none"
              stroke={person.tone}
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M0 -12 V34 M-16 2 H16 M-9 34 L-20 54 M9 34 L20 54"
              fill="none"
              stroke={person.tone}
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
          <path
            d="M-18 20 C-8 28, 8 28, 18 20"
            fill="none"
            stroke={color}
            strokeWidth="2"
            opacity="0.32"
          />
        </g>
      ))}

      <g fill={color} opacity="0.28">
        <circle cx="250" cy="130" r="4" />
        <circle cx="292" cy="120" r="3" />
        <circle cx="338" cy="132" r="4" />
        <circle cx="382" cy="112" r="3" />
      </g>
    </svg>
  );
}

function CarlJungBasePanel({ index, color }: { index: number; color: string }) {
  const pages = [
    'desk',
    'field',
    'shadow',
    'mask',
    'statues',
    'roots',
    'dream',
    'symbols',
    'knot',
    'path',
    'mirror',
    'dialogue',
    'stars',
    'mandala',
    'city',
    'phone',
    'studio',
    'relationship',
    'atlas',
    'sunrise',
  ];
  const scene = pages[index % pages.length];
  const line = '#4c2f1f';
  const paper = '#ead8b4';
  const warm = color;

  return (
    <svg
      viewBox="0 0 390 620"
      role="img"
      aria-label={`Blank Carl Jung comic page ${index + 1}`}
      style={{ display: 'block', width: '100%', height: 'auto', background: paper }}
    >
      <defs>
        <filter id={`grain-${index}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={index + 4} />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.11" />
          </feComponentTransfer>
        </filter>
        <radialGradient id={`glow-${index}`} cx="50%" cy="18%" r="80%">
          <stop offset="0%" stopColor={warm} stopOpacity="0.24" />
          <stop offset="68%" stopColor="#f1dfbc" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#1b1009" stopOpacity="0.08" />
        </radialGradient>
      </defs>

      <rect width="390" height="620" fill={paper} />
      <rect width="390" height="620" fill={`url(#glow-${index})`} />
      <rect width="390" height="620" filter={`url(#grain-${index})`} />

      <g fill="none" stroke={line} strokeLinecap="round" strokeLinejoin="round">
        {scene === 'desk' && (
          <>
            <path
              d="M76 369h238M106 369l-18 81M285 369l18 81M132 346c22-28 60-28 82 0M180 346c14-58 57-87 98-66"
              strokeWidth="5"
              opacity="0.72"
            />
            <path d="M81 275c45-31 91-31 136 0" strokeWidth="3" opacity="0.42" />
            <circle cx="276" cy="256" r="32" strokeWidth="4" opacity="0.55" />
          </>
        )}
        {scene === 'field' && (
          <>
            <path d="M54 372c70-41 137-41 202 0 28-18 55-26 82-22" strokeWidth="5" opacity="0.65" />
            <path
              d="M195 106v250M97 230c72-61 123-57 154 12M195 181c54-60 101-62 141-6"
              strokeWidth="4"
              opacity="0.55"
            />
          </>
        )}
        {scene === 'shadow' && (
          <>
            <path
              d="M196 127c48 0 82 40 82 96 0 76-38 124-82 170-44-46-82-94-82-170 0-56 34-96 82-96z"
              strokeWidth="5"
              opacity="0.7"
            />
            <path
              d="M201 157c47 18 68 62 51 132-11 45-34 77-51 96"
              strokeWidth="11"
              opacity="0.18"
            />
          </>
        )}
        {scene === 'mask' && (
          <>
            <path
              d="M94 155c56-50 147-50 203 0v103c0 62-46 98-101 128-55-30-102-66-102-128z"
              strokeWidth="5"
              opacity="0.68"
            />
            <path
              d="M132 225h54M211 225h54M155 300c31 17 60 17 88 0"
              strokeWidth="4"
              opacity="0.5"
            />
          </>
        )}
        {scene === 'statues' &&
          [86, 145, 204, 263, 322].map((x, i) => (
            <g key={x} opacity={0.48 + i * 0.04}>
              <circle cx={x} cy={176 + (i % 2) * 12} r="18" strokeWidth="4" />
              <path d={`M${x - 19} ${244 + (i % 2) * 10}h38l-9 98h-20z`} strokeWidth="4" />
            </g>
          ))}
        {scene === 'roots' && (
          <>
            <circle cx="195" cy="184" r="72" strokeWidth="5" opacity="0.54" />
            <path
              d="M195 256v145M195 309c-44-24-82-17-112 22M195 331c43-31 80-28 111 8M195 362c-31 9-55 30-72 63M195 384c36 6 62 27 78 63"
              strokeWidth="4"
              opacity="0.54"
            />
          </>
        )}
        {scene === 'dream' && (
          <>
            <path d="M70 336c45-62 89-62 134 0s89 62 134 0" strokeWidth="5" opacity="0.55" />
            <path
              d="M86 224c46-31 91-31 136 0M185 164c27-32 54-32 82 0M130 420c42-18 86-18 130 0"
              strokeWidth="4"
              opacity="0.4"
            />
          </>
        )}
        {scene === 'symbols' && (
          <>
            <circle cx="119" cy="196" r="42" strokeWidth="5" opacity="0.5" />
            <path
              d="M248 153l49 85h-98zM195 287l28 58 64 9-46 44 11 63-57-30-57 30 11-63-46-44 64-9z"
              strokeWidth="5"
              opacity="0.58"
            />
          </>
        )}
        {scene === 'knot' && (
          <>
            <path
              d="M118 254c54-85 129 63 183-22M118 332c54 85 129-63 183 22M116 293c68-42 88-42 160 0"
              strokeWidth="6"
              opacity="0.58"
            />
            <circle cx="195" cy="293" r="72" strokeWidth="3" opacity="0.28" />
          </>
        )}
        {scene === 'path' && (
          <>
            <path
              d="M55 492c74-122 131-238 140-382 16 145 72 262 140 382"
              strokeWidth="5"
              opacity="0.58"
            />
            <path d="M142 236h107M119 314h152M96 393h198" strokeWidth="3" opacity="0.32" />
          </>
        )}
        {scene === 'mirror' && (
          <>
            <path d="M116 118h158l42 65-121 222L74 183z" strokeWidth="5" opacity="0.58" />
            <path
              d="M116 118l79 287 79-287M134 257c39-26 83-26 122 0"
              strokeWidth="4"
              opacity="0.34"
            />
          </>
        )}
        {scene === 'dialogue' && (
          <>
            <circle cx="132" cy="278" r="44" strokeWidth="5" opacity="0.58" />
            <circle cx="260" cy="278" r="44" strokeWidth="5" opacity="0.58" />
            <path
              d="M176 278h40M132 322c17 52 60 78 128 78M260 234c-17-52-60-78-128-78"
              strokeWidth="4"
              opacity="0.38"
            />
          </>
        )}
        {scene === 'stars' && (
          <>
            <path
              d="M195 102l20 54 57 5-44 36 14 56-47-30-47 30 14-56-44-36 57-5z"
              strokeWidth="5"
              opacity="0.62"
            />
            <path
              d="M74 374c79-43 160-43 242 0M96 423c62-25 127-25 195 0"
              strokeWidth="4"
              opacity="0.35"
            />
            {[86, 128, 273, 313, 244].map((x, i) => (
              <circle key={x} cx={x} cy={136 + i * 32} r="4" fill={line} opacity="0.34" />
            ))}
          </>
        )}
        {scene === 'mandala' && (
          <>
            {[142, 96, 52].map((radius) => (
              <circle key={radius} cx="195" cy="286" r={radius} strokeWidth="4" opacity="0.24" />
            ))}
            <path
              d="M195 144v284M53 286h284M94 185l202 202M296 185L94 387"
              strokeWidth="3"
              opacity="0.3"
            />
            <circle cx="195" cy="286" r="20" fill={warm} opacity="0.38" strokeWidth="4" />
          </>
        )}
        {scene === 'city' && (
          <>
            <path
              d="M62 424h266M83 424V252h48v172M154 424V185h58v239M236 424V226h68v198"
              strokeWidth="5"
              opacity="0.52"
            />
            <path d="M89 190c42-36 84-36 126 0 42-36 84-36 126 0" strokeWidth="3" opacity="0.32" />
          </>
        )}
        {scene === 'phone' && (
          <>
            <rect x="132" y="120" width="126" height="248" rx="22" strokeWidth="5" opacity="0.55" />
            <path
              d="M153 205c31-29 57-29 84 0M153 270c31 29 57 29 84 0"
              strokeWidth="4"
              opacity="0.36"
            />
            <circle cx="195" cy="396" r="19" strokeWidth="4" opacity="0.38" />
          </>
        )}
        {scene === 'studio' && (
          <>
            <path
              d="M83 404c77-62 151-62 225 0M111 350c23-80 64-124 123-132M244 164c-13 74-5 125 25 154"
              strokeWidth="5"
              opacity="0.5"
            />
            <circle cx="244" cy="164" r="34" strokeWidth="5" opacity="0.5" />
          </>
        )}
        {scene === 'relationship' && (
          <>
            <path
              d="M124 186c37 0 67 34 67 76 0 73-67 112-67 112s-67-39-67-112c0-42 30-76 67-76zM266 186c37 0 67 34 67 76 0 73-67 112-67 112s-67-39-67-112c0-42 30-76 67-76z"
              strokeWidth="5"
              opacity="0.45"
            />
            <path d="M163 315c22-18 43-18 64 0" strokeWidth="4" opacity="0.42" />
          </>
        )}
        {scene === 'atlas' && (
          <>
            <path
              d="M75 146h240v304H75zM195 146v304M75 248h240M75 350h240"
              strokeWidth="5"
              opacity="0.44"
            />
            <path
              d="M104 206c46-28 86-22 121 18 29-17 55-14 78 10M111 402c55-34 113-34 174 0"
              strokeWidth="4"
              opacity="0.44"
            />
          </>
        )}
        {scene === 'sunrise' && (
          <>
            <path
              d="M56 408h278M98 408c19-66 51-99 97-99s78 33 97 99"
              strokeWidth="5"
              opacity="0.55"
            />
            <path
              d="M195 169v93M96 247l65 65M294 247l-65 65M70 342h91M229 342h91"
              strokeWidth="4"
              opacity="0.4"
            />
          </>
        )}
      </g>

      <g fill="none" stroke={line} strokeLinecap="round" strokeLinejoin="round" opacity="0.24">
        <circle cx="78" cy="104" r="22" strokeWidth="2" />
        <circle cx="312" cy="116" r="28" strokeWidth="2" />
        <path d="M78 82v44M56 104h44M292 116h40M312 96v40" strokeWidth="1.8" />
        <path d="M78 520c42-23 78-19 108 13M220 510c31-28 67-31 108-8" strokeWidth="2.2" />
        <path d="M310 236c24-16 45-13 62 9M31 308c28-20 56-22 86-5" strokeWidth="2" />
      </g>

      <g
        transform="translate(196 440)"
        fill="none"
        stroke={line}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M-48 94 C-42 45 -28 20 0 20 C28 20 42 45 48 94" strokeWidth="5" opacity="0.45" />
        <path
          d="M-34 53 C-15 66 15 66 34 53 M-22 80 C-6 86 8 86 24 80"
          strokeWidth="3"
          opacity="0.32"
        />
        <circle cx="0" cy="-7" r="37" fill={paper} strokeWidth="5" opacity="0.96" />
        <path d="M-29 -22 C-16 -45 18 -46 32 -22" strokeWidth="6" opacity="0.5" />
        <path d="M-31 -4 C-18 -12 -8 -12 5 -4 M9 -4 C22 -12 32 -12 43 -3" strokeWidth="3" />
        <circle cx="-18" cy="-2" r="8" strokeWidth="2.4" opacity="0.8" />
        <circle cx="18" cy="-2" r="8" strokeWidth="2.4" opacity="0.8" />
        <path d="M-10 -2h20M-8 17 C0 13 8 13 16 17" strokeWidth="2.2" opacity="0.6" />
        <path d="M-18 27 C-6 35 8 35 20 27" strokeWidth="3" opacity="0.5" />
        <path d="M-31 -39 C-10 -54 18 -52 34 -36" strokeWidth="3" opacity="0.28" />
      </g>

      <g stroke={line} strokeWidth="1.8" opacity="0.12">
        <path d="M54 90h118M248 520h82M72 496h86" />
        <path d="M312 96c-23 24-45 42-72 55M72 168c34-21 68-28 102-21" />
      </g>
    </svg>
  );
}

/* ── Program descriptions shown on intro screen ────────────────── */
const PROGRAM_INTROS: Record<string, { what: string; gain: string }> = {
  'emotional-intelligence': {
    what: 'A six-page exploration of what emotions actually are, how they shape every decision you make, and how to build the resilience to move through them.',
    gain: "You'll leave with a practical vocabulary for your inner life — and a different relationship to the states you've been trying to avoid.",
  },
};

function FurtherReadingBlock({
  program,
  compact = false,
}: {
  program: Program;
  compact?: boolean;
}) {
  const references = getProgramReferences(program.key);
  return (
    <div
      style={{
        border: `1px solid ${col(program.color, 0.18)}`,
        background: col(program.color, 0.05),
        padding: compact ? 11 : 14,
        marginTop: compact ? 12 : 22,
      }}
    >
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: col(program.color, 0.62),
          marginBottom: 8,
        }}
      >
        Further reading
      </div>
      <div style={{ display: 'grid', gap: 7 }}>
        {references.map((reference) => (
          <div
            key={reference}
            style={{
              fontFamily: SERIF,
              fontSize: compact ? 12 : 13,
              lineHeight: 1.45,
              color: cream(0.72),
            }}
          >
            {reference}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Comic Program Reader ──────────────────────────────────────── */
type Props = {
  program: Program;
  onClose: () => void;
  onBack?: () => void;
  hubBg?: string;
};

export default function ComicProgram({
  program,
  onClose,
  onBack,
  hubBg = 'rgba(10,6,3,0.98)',
}: Props) {
  const [intro, setIntro] = useState(true);
  const [index, setIndex] = useState(0);
  const imageStyles = getImageStyles(program.key);
  const [imageStyle, setImageStyle] = useState(imageStyles[0]?.key ?? 'default');
  const [moreOpen, setMoreOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [textSizeBoost, setTextSizeBoost] =
    useState<(typeof TEXT_SIZE_OPTIONS)[number]['value']>(0);
  const current = program.segments[index];
  const total = program.segments.length;
  const paras = toParagraphs(current.body);

  function prev() {
    if (index > 0) {
      setMoreOpen(false);
      setGuideStep(0);
      setIndex(index - 1);
    }
  }
  function next() {
    if (index < total - 1) {
      setMoreOpen(false);
      setGuideStep(0);
      setIndex(index + 1);
    } else (onBack ?? onClose)();
  }
  function primaryNext() {
    if (LIFE_GUIDE_PROGRAMS.has(program.key)) {
      const finalGuideStep = program.key === 'carl-jung' ? 3 : 1;
      if (guideStep < finalGuideStep) {
        setMoreOpen(false);
        setGuideStep(guideStep + 1);
        return;
      }
    }
    next();
  }
  function resetGuidePage() {
    setMoreOpen(false);
    setGuideStep(0);
  }
  function handleComicSurfaceClick(event: MouseEvent<HTMLElement>, nextAction = next) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX - rect.left < rect.width / 2) {
      prev();
      return;
    }
    nextAction();
  }
  const bodyFontSize = 15 + textSizeBoost;
  const guideFontSize = 13 + textSizeBoost;
  const landscapeGuideFontSize = 12.5 + textSizeBoost;

  const textSizeControl = (
    <fieldset
      aria-label="Education text size"
      style={{
        display: 'flex',
        gap: 4,
        padding: 3,
        margin: 0,
        border: `1px solid ${col(program.color, 0.2)}`,
        borderRadius: 999,
        background: col(program.color, 0.06),
      }}
    >
      {TEXT_SIZE_OPTIONS.map((option) => {
        const active = textSizeBoost === option.value;
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={active}
            onClick={() => setTextSizeBoost(option.value)}
            style={{
              minWidth: option.value === 0 ? 28 : 36,
              border: 0,
              borderRadius: 999,
              background: active ? col(program.color, 0.22) : 'transparent',
              color: active ? cream(0.92) : col(program.color, 0.62),
              cursor: 'pointer',
              fontFamily: SERIF,
              fontSize: 11 + option.value * 0.55,
              fontWeight: 800,
              padding: '5px 7px',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );

  const introData = PROGRAM_INTROS[program.key];

  if (BLANK_BUBBLE_PROGRAMS.has(program.key) && !LAYERED_BUBBLE_PROGRAMS.has(program.key)) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 150,
          background: hubBg,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 672,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 18px',
            flexShrink: 0,
            borderBottom: `1px solid ${col(program.color, 0.12)}`,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: col(program.color, 0.58),
              }}
            >
              Comic book
            </div>
            <div
              style={{
                marginTop: 3,
                fontFamily: SERIF,
                fontSize: 16,
                color: cream(0.9),
                lineHeight: 1.15,
              }}
            >
              {program.domain}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontFamily: SERIF, fontSize: 11, color: col(program.color, 0.42) }}>
              {index + 1} / {total}
            </div>
            {textSizeControl}
            <button
              type="button"
              onClick={onBack ?? onClose}
              style={{
                minWidth: 58,
                background: col(program.color, 0.1),
                border: `1px solid ${col(program.color, 0.34)}`,
                borderRadius: 999,
                color: cream(0.82),
                fontFamily: SERIF,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                padding: '7px 12px',
              }}
            >
              Back
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '14px 18px 18px',
          }}
        >
          <button
            type="button"
            onClick={handleComicSurfaceClick}
            aria-label="Comic page navigation: left previous, right next"
            style={{
              display: 'block',
              width: '100%',
              maxWidth: 430,
              margin: '0 auto',
              padding: 0,
              border: `1.5px solid ${col(program.color, 0.25)}`,
              background: 'transparent',
              boxShadow: `0 0 34px ${col(program.color, 0.12)}`,
              cursor: 'pointer',
            }}
          >
            <PanelImage
              programKey={program.key}
              index={index}
              color={program.color}
              imageStyle={imageStyle}
              alt={`Blank Carl Jung comic page ${index + 1}`}
            />
          </button>

          <div
            style={{
              maxWidth: 430,
              margin: '12px auto 0',
              border: `1px solid ${col(program.color, 0.18)}`,
              background: 'rgba(255,255,255,0.035)',
              padding: 12,
            }}
          >
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 9,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: col(program.color, 0.6),
                marginBottom: 5,
              }}
            >
              page {index + 1} / future text note
            </div>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 17,
                lineHeight: 1.2,
                color: cream(0.9),
              }}
            >
              {current.title}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 18px max(14px, env(safe-area-inset-bottom, 14px))',
            flexShrink: 0,
            borderTop: `1px solid ${col(program.color, 0.1)}`,
          }}
        >
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            style={{
              border: 0,
              background: 'transparent',
              color: col(program.color, index === 0 ? 0.22 : 0.58),
              fontFamily: SERIF,
              fontSize: 13,
              cursor: index === 0 ? 'default' : 'pointer',
              padding: '8px 0',
            }}
          >
            prev
          </button>
          <div
            style={{
              display: 'flex',
              gap: 5,
              maxWidth: 190,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {program.segments.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  setIndex(i);
                }}
                aria-label={`Open page ${i + 1}`}
                style={{
                  width: i === index ? 17 : 5,
                  height: 5,
                  borderRadius: 999,
                  border: 0,
                  background: col(program.color, i === index ? 0.82 : 0.25),
                  padding: 0,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            style={{
              border: 0,
              background: 'transparent',
              color: col(program.color, 0.62),
              fontFamily: SERIF,
              fontSize: 13,
              cursor: 'pointer',
              padding: '8px 0',
            }}
          >
            {index === total - 1 ? 'Education' : 'next'}
          </button>
        </div>
      </div>
    );
  }

  /* ── Intro screen ── */
  if (intro) {
    const { r: _r, g: _g, b: _b } = hex2rgb(program.color);
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 150,
          background: hubBg,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 672,
          margin: '0 auto',
          overflowY: 'auto',
        }}
      >
        {/* header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: col(program.color, 0.4),
            }}
          >
            Education
          </div>
          <button
            type="button"
            onClick={onBack ?? onClose}
            style={{
              background: 'none',
              border: `1px solid ${col(program.color, 0.22)}`,
              borderRadius: 999,
              color: col(program.color, 0.45),
              fontFamily: SERIF,
              fontSize: 11,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              padding: '4px 12px',
            }}
          >
            ← back
          </button>
        </div>

        {/* panel art preview — first scene */}
        <button
          type="button"
          onClick={() => setIntro(false)}
          aria-label={`Begin ${program.domain}`}
          style={{
            display: 'block',
            width: 'auto',
            margin: '10px 20px 0',
            padding: 0,
            borderRadius: 0,
            overflow: 'visible',
            border: `1.5px solid ${col(program.color, 0.2)}`,
            flexShrink: 0,
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <PanelImage
            programKey={program.key}
            index={0}
            color={program.color}
            imageStyle={imageStyle}
          />
        </button>

        {imageStyles.length > 1 && (
          <div style={{ display: 'flex', gap: 8, padding: '12px 20px 0', flexShrink: 0 }}>
            {imageStyles.map((style) => (
              <button
                key={style.key}
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  setImageStyle(style.key);
                }}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  border: `1px solid ${col(program.color, imageStyle === style.key ? 0.5 : 0.2)}`,
                  background: col(program.color, imageStyle === style.key ? 0.16 : 0.05),
                  color: cream(imageStyle === style.key ? 0.9 : 0.56),
                  cursor: 'pointer',
                  fontFamily: SERIF,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  padding: '8px 10px',
                }}
              >
                {style.label}
              </button>
            ))}
          </div>
        )}

        {/* program info */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: col(program.color, 0.55),
                marginBottom: 8,
              }}
            >
              Program
            </div>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 28,
                fontWeight: 700,
                color: cream(0.92),
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
              }}
            >
              {program.domain}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div
              style={{
                background: col(program.color, 0.08),
                border: `1px solid ${col(program.color, 0.15)}`,
                borderRadius: 10,
                padding: '10px 16px',
                flex: 1,
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: cream(0.85) }}>
                {program.segments.length}
              </div>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 10,
                  color: col(program.color, 0.5),
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}
              >
                pages
              </div>
            </div>
            <div
              style={{
                background: col(program.color, 0.08),
                border: `1px solid ${col(program.color, 0.15)}`,
                borderRadius: 10,
                padding: '10px 16px',
                flex: 1,
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: cream(0.85) }}>
                ~{program.segments.length * 2}m
              </div>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 10,
                  color: col(program.color, 0.5),
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}
              >
                to read
              </div>
            </div>
          </div>

          {introData && (
            <>
              <p
                style={{
                  fontFamily: SERIF,
                  fontSize: 14,
                  color: cream(0.7),
                  lineHeight: 1.85,
                  margin: 0,
                }}
              >
                {introData.what}
              </p>
              <div style={{ borderLeft: `3px solid ${col(program.color, 0.5)}`, paddingLeft: 14 }}>
                <div
                  style={{
                    fontFamily: SERIF,
                    fontSize: 10,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: col(program.color, 0.45),
                    marginBottom: 5,
                  }}
                >
                  You'll walk away with
                </div>
                <p
                  style={{
                    fontFamily: SERIF,
                    fontSize: 13,
                    color: cream(0.62),
                    lineHeight: 1.8,
                    margin: 0,
                    fontStyle: 'italic',
                  }}
                >
                  {introData.gain}
                </p>
              </div>
            </>
          )}
        </div>

        {/* begin button */}
        <div style={{ padding: '16px 24px 28px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setIntro(false)}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 14,
              cursor: 'pointer',
              background: col(program.color, 0.12),
              border: `1.5px solid ${col(program.color, 0.45)}`,
              fontFamily: SERIF,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: cream(0.92),
              boxShadow: `0 0 24px ${col(program.color, 0.12)}`,
            }}
          >
            Begin →
          </button>
        </div>
      </div>
    );
  }

  if (TEXT_ON_IMAGE_PROGRAMS.has(program.key)) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 150,
          background: hubBg,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 672,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '74px minmax(0, 1fr) 74px',
            alignItems: 'center',
            padding: '12px 18px',
            flexShrink: 0,
            borderBottom: `1px solid ${col(program.color, 0.12)}`,
          }}
        >
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 11,
              color: col(program.color, 0.42),
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {index + 1} / {total}
          </div>
          <h1
            style={{
              margin: 0,
              minWidth: 0,
              textAlign: 'center',
              fontFamily: SERIF,
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1.08,
              color: cream(0.94),
              overflowWrap: 'anywhere',
            }}
          >
            {program.domain}
          </h1>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onBack ?? onClose}
              style={{
                background: 'none',
                border: `1px solid ${col(program.color, 0.22)}`,
                borderRadius: 999,
                color: col(program.color, 0.48),
                fontFamily: SERIF,
                fontSize: 11,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                padding: '5px 13px',
              }}
            >
              back
            </button>
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <button
            type="button"
            onClick={handleComicSurfaceClick}
            aria-label="Comic page navigation: left previous, right next"
            style={{
              display: 'block',
              width: '100%',
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
            }}
          >
            <PanelImage
              programKey={program.key}
              index={index}
              color={program.color}
              imageStyle={imageStyle}
            />
          </button>
          <div
            style={{
              position: 'sticky',
              left: 0,
              right: 0,
              bottom: 0,
              marginTop: -220,
              padding: '96px 18px 18px',
              background: `linear-gradient(180deg, transparent 0%, ${hubBg}ee 38%, ${hubBg} 100%)`,
              color: cream(0.9),
            }}
          >
            <div
              style={{
                border: `1px solid ${col(program.color, 0.26)}`,
                background: 'rgba(10,6,3,0.68)',
                backdropFilter: 'blur(10px)',
                padding: 16,
                boxShadow: `0 18px 46px ${col(program.color, 0.13)}`,
              }}
            >
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 9,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: col(program.color, 0.66),
                  marginBottom: 6,
                }}
              >
                page {index + 1}
              </div>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 21,
                  fontWeight: 700,
                  color: cream(0.94),
                  lineHeight: 1.18,
                  marginBottom: 10,
                }}
              >
                {current.title}
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {paras.slice(0, 2).map((p, i) => (
                  <p
                    key={i}
                    style={{
                      fontFamily: SERIF,
                      fontSize: 14.5,
                      lineHeight: 1.72,
                      color: cream(i === 0 ? 0.78 : 0.64),
                      margin: 0,
                    }}
                  >
                    {p}
                  </p>
                ))}
              </div>
              {index === total - 1 && <FurtherReadingBlock program={program} compact />}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: `1px solid ${col(program.color, 0.12)}`,
                }}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    prev();
                  }}
                  disabled={index === 0}
                  style={{
                    border: 0,
                    background: 'transparent',
                    color: col(program.color, index === 0 ? 0.22 : 0.58),
                    fontFamily: SERIF,
                    fontSize: 13,
                    cursor: index === 0 ? 'default' : 'pointer',
                    padding: '8px 0',
                  }}
                >
                  Previous
                </button>
                <div style={{ display: 'flex', gap: 5 }}>
                  {program.segments.map((_, i) => (
                    <span
                      key={i}
                      style={{
                        width: i === index ? 18 : 5,
                        height: 5,
                        borderRadius: 999,
                        background: col(program.color, i === index ? 0.8 : 0.24),
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={next}
                  style={{
                    border: 0,
                    background: 'transparent',
                    color: col(program.color, 0.62),
                    fontFamily: SERIF,
                    fontSize: 13,
                    cursor: 'pointer',
                    padding: '8px 0',
                  }}
                >
                  {index === total - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (LAYERED_BUBBLE_PROGRAMS.has(program.key)) {
    const isLandscape =
      LANDSCAPE_LAYERED_PROGRAMS.has(program.key) && program.key === 'thich-nhat-hanh'
        ? index < 2
        : LANDSCAPE_LAYERED_PROGRAMS.has(program.key);
    const usesGuideTextBox = LIFE_GUIDE_PROGRAMS.has(program.key);
    const isJung = program.key === 'carl-jung';
    const showsGuideTextBox =
      usesGuideTextBox && (isJung ? guideStep === 1 || guideStep === 3 : guideStep >= 1);
    const reflectionPrompts = guideReflectionPrompts(program.key, index);
    const jungDeepParagraphs = complementaryJungText(
      current.title,
      current.body,
      reflectionPrompts,
    );
    const visibleGuideParagraphs = isJung
      ? guideStep === 3
        ? jungDeepParagraphs
        : [conciseLesson(current.body)]
      : moreOpen
        ? paras
        : [conciseLesson(current.body)];
    const activeImageStyle = isJung ? (guideStep >= 2 ? 'default' : 'no-bubbles') : imageStyle;
    const showGuideTitle = !isJung || guideStep !== 3;
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 150,
          background: hubBg,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 672,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '74px minmax(0, 1fr) 74px',
            alignItems: 'center',
            padding: '12px 18px',
            flexShrink: 0,
            borderBottom: `1px solid ${col(program.color, 0.12)}`,
          }}
        >
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 11,
              color: col(program.color, 0.42),
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {index + 1} / {total}
          </div>
          <h1
            style={{
              margin: 0,
              minWidth: 0,
              textAlign: 'center',
              fontFamily: SERIF,
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1.08,
              color: cream(0.94),
              overflowWrap: 'anywhere',
            }}
          >
            {program.domain}
          </h1>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onBack ?? onClose}
              style={{
                minWidth: 58,
                background: col(program.color, 0.1),
                border: `1px solid ${col(program.color, 0.34)}`,
                borderRadius: 999,
                color: cream(0.82),
                fontFamily: SERIF,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                padding: '7px 12px',
              }}
            >
              Back
            </button>
          </div>
        </div>

        {THREE_PART_GUIDES.has(program.key) && (
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '10px 14px 0',
              flexShrink: 0,
            }}
          >
            {GUIDE_PARTS.map((part) => {
              const activePart = index >= part.start && index <= part.end;
              return (
                <button
                  key={part.label}
                  type="button"
                  aria-label={`${part.label} ${part.start + 1}-${part.end + 1}`}
                  onClick={() => {
                    resetGuidePage();
                    setIndex(part.start);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    border: `1px solid ${col(program.color, activePart ? 0.48 : 0.18)}`,
                    background: col(program.color, activePart ? 0.16 : 0.05),
                    color: cream(activePart ? 0.9 : 0.54),
                    cursor: 'pointer',
                    fontFamily: SERIF,
                    fontSize: 10.5,
                    letterSpacing: '0.08em',
                    padding: '7px 8px',
                  }}
                >
                  {part.label}
                  <span style={{ opacity: 0.55 }}>
                    {' '}
                    {part.start + 1}-{part.end + 1}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '14px 14px 18px',
            paddingBottom: 'max(18px, env(safe-area-inset-bottom, 18px))',
          }}
        >
          <div
            style={{
              display: 'block',
              position: 'relative',
              width: isLandscape
                ? 'min(100%, 620px, calc((100dvh - 150px) * 1.78))'
                : 'min(100%, 390px, calc((100dvh - 150px) * 0.63))',
              maxWidth: '100%',
              margin: '0 auto',
              padding: 0,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              boxShadow: `0 16px 42px ${col(program.color, 0.14)}`,
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={(event) => handleComicSurfaceClick(event, primaryNext)}
              aria-label={
                usesGuideTextBox && guideStep === 0
                  ? 'Reveal comic text'
                  : isJung && guideStep === 1
                    ? 'Show second comic image'
                    : isJung && guideStep === 2
                      ? 'Reveal deeper comic text'
                      : index === total - 1
                        ? 'Return to education'
                        : 'Next comic page'
              }
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
              }}
            />
            <PanelImage
              programKey={program.key}
              index={index}
              color={program.color}
              imageStyle={activeImageStyle}
              alt={
                program.key === 'carl-jung'
                  ? `Carl Jung comic page ${index + 1}`
                  : `${program.domain} comic page ${index + 1}`
              }
            />
            {showsGuideTextBox && (
              <div
                style={{
                  position: 'absolute',
                  left: isLandscape ? 16 : 14,
                  right: isLandscape ? 16 : 14,
                  bottom: isLandscape ? 14 : 16,
                  zIndex: 2,
                  border: `1px solid ${col(program.color, 0.28)}`,
                  background: 'rgba(44, 24, 13, 0.84)',
                  backdropFilter: 'blur(8px)',
                  padding: isLandscape ? '12px 14px' : '13px 14px',
                  boxShadow: `0 18px 44px ${col(program.color, 0.18)}`,
                  maxHeight: moreOpen ? (isLandscape ? '58%' : '48%') : '42%',
                  overflowY: moreOpen ? 'auto' : 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'start',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: showGuideTitle ? 7 : 0,
                  }}
                >
                  {showGuideTitle && (
                    <div
                      style={{
                        fontFamily: SERIF,
                        fontSize: isLandscape ? 16 : 18,
                        fontWeight: 700,
                        color: cream(0.95),
                        lineHeight: 1.18,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {current.title}
                    </div>
                  )}
                  {!isJung && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMoreOpen((value) => !value);
                      }}
                      style={{
                        flexShrink: 0,
                        borderRadius: 999,
                        border: `1px solid ${col(program.color, 0.36)}`,
                        background: col(program.color, 0.12),
                        color: col(program.color, 0.86),
                        cursor: 'pointer',
                        fontFamily: SERIF,
                        fontSize: 10,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        padding: '5px 9px',
                      }}
                    >
                      {moreOpen ? 'less' : 'more'}
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gap: moreOpen ? 8 : 0 }}>
                  {visibleGuideParagraphs.map((paragraph, paragraphIndex) => (
                    <p
                      key={paragraph}
                      style={{
                        margin: 0,
                        color: paragraphIndex === 0 ? col(program.color, 0.9) : cream(0.68),
                        fontFamily: SERIF,
                        fontSize: isLandscape ? landscapeGuideFontSize : guideFontSize,
                        lineHeight: 1.48,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
          {!isJung && imageStyles.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: 7,
                maxWidth: isLandscape ? 620 : 390,
                margin: '10px auto 0',
              }}
            >
              {imageStyles.map((style) => (
                <button
                  key={style.key}
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    setImageStyle(style.key);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    border: `1px solid ${col(program.color, imageStyle === style.key ? 0.5 : 0.2)}`,
                    background: col(program.color, imageStyle === style.key ? 0.16 : 0.05),
                    color: cream(imageStyle === style.key ? 0.9 : 0.56),
                    cursor: 'pointer',
                    fontFamily: SERIF,
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    padding: '8px 10px',
                  }}
                >
                  {style.label}
                </button>
              ))}
            </div>
          )}
          {index === total - 1 && showsGuideTextBox && (
            <div style={{ maxWidth: isLandscape ? 620 : 390, margin: '12px auto 0' }}>
              <FurtherReadingBlock program={program} compact />
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 18px max(14px, env(safe-area-inset-bottom, 14px))',
            flexShrink: 0,
            borderTop: `1px solid ${col(program.color, 0.1)}`,
          }}
        >
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            style={{
              border: 0,
              background: 'transparent',
              color: col(program.color, index === 0 ? 0.22 : 0.58),
              fontFamily: SERIF,
              fontSize: 13,
              cursor: index === 0 ? 'default' : 'pointer',
              padding: '8px 0',
            }}
          >
            prev
          </button>
          <div
            style={{
              display: 'flex',
              gap: 5,
              maxWidth: 190,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {program.segments.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  resetGuidePage();
                  setIndex(i);
                }}
                aria-label={`Open page ${i + 1}`}
                style={{
                  width: i === index ? 17 : 5,
                  height: 5,
                  borderRadius: 999,
                  border: 0,
                  background: col(program.color, i === index ? 0.82 : 0.25),
                  padding: 0,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={primaryNext}
            style={{
              border: 0,
              background: 'transparent',
              color: col(program.color, 0.62),
              fontFamily: SERIF,
              fontSize: 13,
              cursor: 'pointer',
              padding: '8px 0',
            }}
          >
            {usesGuideTextBox && guideStep === 0
              ? 'text'
              : isJung && guideStep === 1
                ? 'image'
                : isJung && guideStep === 2
                  ? 'more'
                  : index === total - 1
                    ? 'Education'
                    : 'next'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        background: hubBg,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 672,
        margin: '0 auto',
        overflowY: 'auto',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          flexShrink: 0,
          borderBottom: `1px solid ${col(program.color, 0.12)}`,
        }}
      >
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 11,
            color: col(program.color, 0.55),
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {program.domain}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: SERIF, fontSize: 11, color: col(program.color, 0.4) }}>
            {index + 1} / {total}
          </div>
          {textSizeControl}
          <button
            type="button"
            onClick={onBack ?? onClose}
            style={{
              background: 'none',
              border: `1px solid ${col(program.color, 0.22)}`,
              borderRadius: 999,
              color: col(program.color, 0.45),
              fontFamily: SERIF,
              fontSize: 11,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              padding: '4px 12px',
            }}
          >
            ← back
          </button>
        </div>
      </div>

      {/* ── Panel art ── */}
      <button
        type="button"
        onClick={handleComicSurfaceClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            next();
          }
        }}
        aria-label={index === total - 1 ? 'Return to education' : 'Next comic page'}
        style={{
          flexShrink: 0,
          margin: '16px 20px 0',
          borderRadius: 0,
          overflow: 'visible',
          border: `1.5px solid ${col(program.color, 0.25)}`,
          boxShadow: `0 0 32px ${col(program.color, 0.1)}`,
          cursor: 'pointer',
          display: 'block',
          padding: 0,
          width: 'calc(100% - 40px)',
          background: 'transparent',
          textAlign: 'left',
        }}
      >
        <PanelImage
          programKey={program.key}
          index={index}
          color={program.color}
          imageStyle={imageStyle}
        />
      </button>

      {imageStyles.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '10px 20px 0',
            flexShrink: 0,
          }}
        >
          {imageStyles.map((style) => (
            <button
              key={style.key}
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setImageStyle(style.key);
              }}
              style={{
                flex: 1,
                minHeight: 34,
                borderRadius: 999,
                border: `1px solid ${col(program.color, imageStyle === style.key ? 0.5 : 0.2)}`,
                background: col(program.color, imageStyle === style.key ? 0.16 : 0.05),
                color: cream(imageStyle === style.key ? 0.9 : 0.56),
                cursor: 'pointer',
                fontFamily: SERIF,
                fontSize: 11,
                letterSpacing: '0.08em',
              }}
            >
              {style.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Caption + body ── */}
      <div style={{ padding: '20px 20px 24px' }}>
        {/* title caption box */}
        <div
          style={{
            borderLeft: `3px solid ${col(program.color, 0.7)}`,
            paddingLeft: 14,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 9,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: col(program.color, 0.5),
              marginBottom: 5,
            }}
          >
            page {index + 1}
          </div>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 20,
              fontWeight: 700,
              color: cream(0.92),
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
            }}
          >
            {current.title}
          </div>
        </div>

        {/* body paragraphs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {paras.map((para, i) => (
            <p
              key={i}
              style={{
                fontFamily: SERIF,
                fontSize: bodyFontSize,
                color: cream(0.72),
                lineHeight: 1.9,
                margin: 0,
              }}
            >
              {para}
            </p>
          ))}
        </div>
        {index === total - 1 && <FurtherReadingBlock program={program} />}
      </div>

      {/* ── Navigation ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px 20px',
          flexShrink: 0,
          borderTop: `1px solid ${col(program.color, 0.1)}`,
        }}
      >
        <button
          type="button"
          onClick={prev}
          disabled={index === 0}
          style={{
            fontFamily: SERIF,
            fontSize: 13,
            color: col(program.color, index === 0 ? 0.2 : 0.55),
            background: 'none',
            border: 'none',
            cursor: index === 0 ? 'default' : 'pointer',
            padding: '6px 0',
          }}
        >
          ← prev
        </button>

        {/* dot indicators */}
        <div style={{ display: 'flex', gap: 6 }}>
          {program.segments.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setIndex(i);
              }}
              aria-label={`Open page ${i + 1}`}
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: col(program.color, i === index ? 0.8 : 0.25),
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'width 0.2s, background 0.2s',
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          style={{
            fontFamily: SERIF,
            fontSize: 13,
            color: index === total - 1 ? col(program.color, 0.7) : col(program.color, 0.55),
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 0',
            fontWeight: index === total - 1 ? 700 : 400,
          }}
        >
          {index === total - 1 ? '← Education' : 'next →'}
        </button>
      </div>
    </div>
  );
}
