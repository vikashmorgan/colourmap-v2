'use client';

import { useEffect, useState } from 'react';
import { getEmotionalWord } from '@/lib/emotional-vocabulary';
import { useCheckIn } from './CheckInContext';

function CatSvg({ viewBox, paths }: { viewBox: string; paths: string }) {
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG paths are static constants defined in this file
    <svg viewBox={viewBox} width="100" height="100" dangerouslySetInnerHTML={{ __html: paths }} />
  );
}

/**
 * Cat pose SVG paths — 7 states from contracted to expansive.
 * Brown line-art style matching the cockpit captain cat.
 * Each pose is a self-contained SVG group.
 */
const CAT_POSES: {
  id: string;
  ringColor: string;
  viewBox: string;
  paths: string;
}[] = [
  {
    // Crushed — curled tight, eyes closed
    id: 'crushed',
    ringColor: '#8B6F6F',
    viewBox: '0 0 120 120',
    paths: `
      <g fill="none" stroke="#5C3018" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- body curled -->
        <ellipse cx="60" cy="68" rx="28" ry="18" />
        <!-- head tucked -->
        <circle cx="42" cy="55" r="14" />
        <!-- closed eyes -->
        <path d="M37 53 Q39 51 41 53" />
        <path d="M44 52 Q46 50 48 52" />
        <!-- ears flat -->
        <path d="M32 46 L29 40 L36 44" />
        <path d="M48 44 L52 39 L50 46" />
        <!-- tail wrapped around -->
        <path d="M88 65 Q92 58 86 52 Q80 48 74 54" />
        <!-- whiskers (droopy) -->
        <line x1="30" y1="57" x2="20" y2="60" />
        <line x1="30" y1="59" x2="21" y2="63" />
      </g>
    `,
  },
  {
    // Heavy — sitting hunched, ears flat
    id: 'heavy',
    ringColor: '#7A8B8B',
    viewBox: '0 0 120 120',
    paths: `
      <g fill="none" stroke="#5C3018" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- body sitting low -->
        <path d="M44 85 Q42 65 48 55 Q54 48 60 48 Q66 48 72 55 Q78 65 76 85" />
        <!-- head -->
        <circle cx="60" cy="40" r="16" />
        <!-- eyes half-closed -->
        <path d="M53 39 Q55 37 57 39" />
        <path d="M63 39 Q65 37 67 39" />
        <!-- nose -->
        <path d="M59 43 L60 44 L61 43" />
        <!-- ears slightly flat -->
        <path d="M48 28 L44 20 L52 26" />
        <path d="M68 26 L76 20 L72 28" />
        <!-- tail low -->
        <path d="M76 80 Q84 78 88 72 Q90 68 87 65" />
        <!-- whiskers -->
        <line x1="47" y1="43" x2="36" y2="44" />
        <line x1="47" y1="45" x2="37" y2="48" />
        <line x1="73" y1="43" x2="84" y2="44" />
        <line x1="73" y1="45" x2="83" y2="48" />
      </g>
    `,
  },
  {
    // Stuck — sitting upright, neutral gaze
    id: 'stuck',
    ringColor: '#A89080',
    viewBox: '0 0 120 120',
    paths: `
      <g fill="none" stroke="#5C3018" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- body sitting upright -->
        <path d="M42 88 Q40 62 46 50 Q52 42 60 42 Q68 42 74 50 Q80 62 78 88" />
        <!-- head -->
        <circle cx="60" cy="34" r="16" />
        <!-- eyes open, neutral -->
        <circle cx="54" cy="33" r="2" fill="#5C3018" />
        <circle cx="66" cy="33" r="2" fill="#5C3018" />
        <!-- nose -->
        <path d="M59 37 L60 38.5 L61 37" />
        <!-- mouth neutral -->
        <path d="M56 40 Q60 41 64 40" />
        <!-- ears upright -->
        <path d="M48 22 L44 12 L54 20" />
        <path d="M66 20 L76 12 L72 22" />
        <!-- tail at rest -->
        <path d="M78 82 Q86 78 90 72" />
        <!-- whiskers -->
        <line x1="46" y1="37" x2="34" y2="36" />
        <line x1="46" y1="39" x2="35" y2="41" />
        <line x1="74" y1="37" x2="86" y2="36" />
        <line x1="74" y1="39" x2="85" y2="41" />
        <!-- front paws -->
        <ellipse cx="50" cy="88" rx="5" ry="3" />
        <ellipse cx="70" cy="88" rx="5" ry="3" />
      </g>
    `,
  },
  {
    // Still/Grounding — standing calm, paws steady
    id: 'grounding',
    ringColor: '#8FA68A',
    viewBox: '0 0 120 120',
    paths: `
      <g fill="none" stroke="#5C3018" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- body standing -->
        <path d="M40 82 L42 55 Q48 42 60 40 Q72 42 78 55 L80 82" />
        <!-- legs -->
        <line x1="44" y1="75" x2="44" y2="90" />
        <line x1="54" y1="78" x2="54" y2="90" />
        <line x1="66" y1="78" x2="66" y2="90" />
        <line x1="76" y1="75" x2="76" y2="90" />
        <!-- paws -->
        <ellipse cx="44" cy="91" rx="4" ry="2.5" />
        <ellipse cx="54" cy="91" rx="4" ry="2.5" />
        <ellipse cx="66" cy="91" rx="4" ry="2.5" />
        <ellipse cx="76" cy="91" rx="4" ry="2.5" />
        <!-- head -->
        <circle cx="60" cy="32" r="16" />
        <!-- eyes calm -->
        <circle cx="54" cy="31" r="2.5" fill="#5C3018" />
        <circle cx="66" cy="31" r="2.5" fill="#5C3018" />
        <!-- nose -->
        <path d="M59 35 L60 37 L61 35" />
        <!-- gentle smile -->
        <path d="M55 39 Q60 42 65 39" />
        <!-- ears alert -->
        <path d="M48 20 L43 9 L54 17" />
        <path d="M66 17 L77 9 L72 20" />
        <!-- tail calm up -->
        <path d="M80 75 Q88 68 90 58 Q91 52 88 48" />
        <!-- whiskers -->
        <line x1="46" y1="35" x2="32" y2="33" />
        <line x1="46" y1="37" x2="33" y2="38" />
        <line x1="74" y1="35" x2="88" y2="33" />
        <line x1="74" y1="37" x2="87" y2="38" />
      </g>
    `,
  },
  {
    // Open — walking, tail lifting
    id: 'open',
    ringColor: '#C4A265',
    viewBox: '0 0 120 120',
    paths: `
      <g fill="none" stroke="#5C3018" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- body in motion -->
        <path d="M36 78 Q38 55 48 44 Q56 38 62 38 Q70 40 76 50 L80 78" />
        <!-- legs walking -->
        <path d="M42 72 L38 90" />
        <path d="M52 76 L56 90" />
        <path d="M66 76 L62 90" />
        <path d="M76 72 L80 90" />
        <!-- paws -->
        <ellipse cx="37" cy="91" rx="4" ry="2.5" />
        <ellipse cx="57" cy="91" rx="4" ry="2.5" />
        <ellipse cx="61" cy="91" rx="4" ry="2.5" />
        <ellipse cx="81" cy="91" rx="4" ry="2.5" />
        <!-- head turned slightly -->
        <circle cx="56" cy="30" r="16" />
        <!-- bright eyes -->
        <circle cx="50" cy="28" r="2.5" fill="#5C3018" />
        <circle cx="62" cy="29" r="2.5" fill="#5C3018" />
        <!-- eye shine -->
        <circle cx="49" cy="27" r="0.8" fill="white" />
        <circle cx="61" cy="28" r="0.8" fill="white" />
        <!-- nose -->
        <path d="M55 33 L56 35 L57 33" />
        <!-- happy mouth -->
        <path d="M51 37 Q56 40 61 37" />
        <!-- ears perked -->
        <path d="M44 18 L39 7 L50 15" />
        <path d="M62 16 L72 7 L68 18" />
        <!-- tail high -->
        <path d="M80 70 Q90 58 88 44 Q87 38 83 34" />
        <!-- whiskers up -->
        <line x1="42" y1="33" x2="28" y2="30" />
        <line x1="42" y1="35" x2="29" y2="34" />
        <line x1="70" y1="33" x2="84" y2="30" />
        <line x1="70" y1="35" x2="83" y2="34" />
      </g>
    `,
  },
  {
    // Alive/Flowing — light step, eyes bright
    id: 'flowing',
    ringColor: '#C09B8C',
    viewBox: '0 0 120 120',
    paths: `
      <g fill="none" stroke="#5C3018" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- body light, slightly bouncy -->
        <path d="M38 74 Q40 52 50 42 Q58 36 64 36 Q72 38 78 48 L82 74" />
        <!-- legs mid-stride -->
        <path d="M44 68 L40 86" />
        <path d="M54 72 L58 86" />
        <path d="M68 72 L64 86" />
        <path d="M78 68 L82 86" />
        <!-- paws -->
        <ellipse cx="39" cy="87" rx="4" ry="2.5" />
        <ellipse cx="59" cy="87" rx="4" ry="2.5" />
        <ellipse cx="63" cy="87" rx="4" ry="2.5" />
        <ellipse cx="83" cy="87" rx="4" ry="2.5" />
        <!-- head -->
        <circle cx="58" cy="28" r="16" />
        <!-- big bright eyes -->
        <circle cx="52" cy="26" r="3" fill="#5C3018" />
        <circle cx="64" cy="27" r="3" fill="#5C3018" />
        <!-- eye shine -->
        <circle cx="51" cy="25" r="1" fill="white" />
        <circle cx="63" cy="26" r="1" fill="white" />
        <!-- nose -->
        <path d="M57 31 L58 33 L59 31" />
        <!-- big smile -->
        <path d="M52 35 Q58 39 64 35" />
        <!-- ears tall -->
        <path d="M46 16 L40 4 L52 13" />
        <path d="M64 14 L76 4 L70 16" />
        <!-- tail high and curly -->
        <path d="M82 66 Q92 52 88 38 Q86 30 80 28 Q76 30 78 36" />
        <!-- whiskers up and wide -->
        <line x1="44" y1="31" x2="28" y2="26" />
        <line x1="44" y1="33" x2="29" y2="30" />
        <line x1="72" y1="31" x2="88" y2="26" />
        <line x1="72" y1="33" x2="87" y2="30" />
      </g>
    `,
  },
  {
    // Expansive/Radiating — captain pose, upright, at the wheel
    id: 'radiating',
    ringColor: '#D4B896',
    viewBox: '0 0 120 120',
    paths: `
      <g fill="none" stroke="#5C3018" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- body tall and proud -->
        <path d="M42 82 Q40 55 48 44 Q56 36 60 35 Q64 36 72 44 Q80 55 78 82" />
        <!-- legs strong -->
        <line x1="46" y1="76" x2="46" y2="92" />
        <line x1="56" y1="80" x2="56" y2="92" />
        <line x1="64" y1="80" x2="64" y2="92" />
        <line x1="74" y1="76" x2="74" y2="92" />
        <!-- paws -->
        <ellipse cx="46" cy="93" rx="4" ry="2.5" />
        <ellipse cx="56" cy="93" rx="4" ry="2.5" />
        <ellipse cx="64" cy="93" rx="4" ry="2.5" />
        <ellipse cx="74" cy="93" rx="4" ry="2.5" />
        <!-- head held high -->
        <circle cx="60" cy="26" r="16" />
        <!-- radiant eyes -->
        <circle cx="54" cy="24" r="3" fill="#5C3018" />
        <circle cx="66" cy="24" r="3" fill="#5C3018" />
        <!-- eye shine big -->
        <circle cx="53" cy="23" r="1.2" fill="white" />
        <circle cx="65" cy="23" r="1.2" fill="white" />
        <!-- nose -->
        <path d="M59 28 L60 30 L61 28" />
        <!-- confident smile -->
        <path d="M54 32 Q60 36 66 32" />
        <!-- ears tall and proud -->
        <path d="M48 14 L42 2 L54 11" />
        <path d="M66 11 L78 2 L72 14" />
        <!-- ship wheel (simplified) -->
        <circle cx="86" cy="60" r="12" />
        <circle cx="86" cy="60" r="3" />
        <line x1="86" y1="48" x2="86" y2="72" />
        <line x1="74" y1="60" x2="98" y2="60" />
        <line x1="77.5" y1="51.5" x2="94.5" y2="68.5" />
        <line x1="94.5" y1="51.5" x2="77.5" y2="68.5" />
        <!-- paw on wheel -->
        <path d="M78 55 Q82 52 86 54" />
        <!-- tail high and proud -->
        <path d="M42 70 Q32 58 34 44 Q35 36 40 32" />
        <!-- whiskers wide -->
        <line x1="46" y1="28" x2="30" y2="24" />
        <line x1="46" y1="30" x2="31" y2="28" />
        <line x1="74" y1="28" x2="90" y2="24" />
        <line x1="74" y1="30" x2="89" y2="28" />
      </g>
    `,
  },
];

function getPoseIndex(value: number): number {
  if (value <= 12) return 0;
  if (value <= 25) return 1;
  if (value <= 37) return 2;
  if (value <= 50) return 3;
  if (value <= 62) return 4;
  if (value <= 75) return 5;
  return 6;
}

export default function CatMirror() {
  const { sliderValue, barActive, insightText, isLoadingInsight } = useCheckIn();
  const [prevPoseIdx, setPrevPoseIdx] = useState(3);
  const [transitioning, setTransitioning] = useState(false);

  const poseIdx = getPoseIndex(sliderValue);
  const pose = CAT_POSES[poseIdx];
  const word = getEmotionalWord(sliderValue);

  // Handle pose transitions
  useEffect(() => {
    if (poseIdx !== prevPoseIdx) {
      setTransitioning(true);
      const timer = setTimeout(() => {
        setPrevPoseIdx(poseIdx);
        setTransitioning(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [poseIdx, prevPoseIdx]);

  const ringColor = pose.ringColor;

  return (
    <div className="flex flex-col items-center py-4 select-none">
      {/* Aura ring + Cat */}
      <div className="relative" style={{ width: 180, height: 180 }}>
        {/* Outer ring */}
        <svg
          viewBox="0 0 180 180"
          className="absolute inset-0"
          style={{ transition: 'all 600ms ease' }}
        >
          {/* Concentric rings */}
          <circle
            cx="90"
            cy="90"
            r="88"
            fill="none"
            stroke={ringColor}
            strokeWidth="0.5"
            opacity={barActive ? 0.12 : 0.06}
            style={{ transition: 'all 600ms ease' }}
          />
          <circle
            cx="90"
            cy="90"
            r="78"
            fill="none"
            stroke={ringColor}
            strokeWidth="0.8"
            opacity={barActive ? 0.2 : 0.1}
            style={{ transition: 'all 600ms ease' }}
          />
          <circle
            cx="90"
            cy="90"
            r="68"
            fill="none"
            stroke={ringColor}
            strokeWidth="1"
            opacity={barActive ? 0.3 : 0.15}
            style={{ transition: 'all 600ms ease' }}
          />

          {/* Aura fill */}
          <circle
            cx="90"
            cy="90"
            r="68"
            fill={ringColor}
            opacity={barActive ? 0.06 : 0.03}
            style={{ transition: 'all 600ms ease' }}
          />

          {/* Losange accents at cardinal points */}
          {[
            { x: 90, y: 5 }, // top
            { x: 175, y: 90 }, // right
            { x: 90, y: 175 }, // bottom
            { x: 5, y: 90 }, // left
          ].map((pos, i) => (
            <rect
              key={i}
              x={pos.x - 3}
              y={pos.y - 3}
              width="6"
              height="6"
              rx="1"
              transform={`rotate(45, ${pos.x}, ${pos.y})`}
              fill="#C4A060"
              opacity={barActive ? 0.35 : 0.15}
              style={{ transition: 'all 600ms ease' }}
            />
          ))}
        </svg>

        {/* Cat SVG */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            opacity: transitioning ? 0.4 : 1,
            transition: 'opacity 300ms ease',
          }}
        >
          <CatSvg viewBox={pose.viewBox} paths={pose.paths} />
        </div>
      </div>

      {/* Speech bubble */}
      <div className="mt-3 max-w-[260px] text-center">
        {/* Connector triangle */}
        <div className="flex justify-center mb-1">
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderBottom: `5px solid ${ringColor}15`,
              transition: 'all 600ms ease',
            }}
          />
        </div>

        {/* Bubble content */}
        <div
          className="rounded-xl px-4 py-2.5 transition-all duration-500"
          style={{
            background: `${ringColor}08`,
            border: `1px solid ${ringColor}15`,
          }}
        >
          {isLoadingInsight && !insightText && (
            <div className="flex gap-1.5 items-center justify-center py-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{
                    background: ringColor,
                    opacity: 0.4,
                    animationDelay: `${i * 200}ms`,
                  }}
                />
              ))}
            </div>
          )}

          {insightText && (
            <p
              className="text-xs leading-relaxed animate-in fade-in duration-500"
              style={{ color: `${ringColor}cc` }}
            >
              {insightText}
            </p>
          )}

          {!insightText && !isLoadingInsight && (
            <p
              className="text-sm font-serif italic tracking-wide transition-all duration-500"
              style={{ color: barActive ? ringColor : `${ringColor}80` }}
            >
              {word}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
