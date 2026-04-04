'use client';

export interface SoulMapData {
  avgSlider: number;
  recentEmotions: { word: string; value: number; time: string }[];
  fears: string[];
  strengths: string[];
  weaknesses: string[];
  energy: string[];
  vision: string;
  fearCount: number;
  gratitudeCount: number;
  avoidanceCount: number;
  confusionCount: number;
  body: number;
  attitude: number;
  structure: number;
  activeMissions: number;
  completedMissions: number;
  archetype: string;
  chapter: string;
}

interface Territory {
  id: string;
  name: string;
  cx: number;
  cy: number;
  r: number;
  colors: [string, string, string];
  intensity: number;
  items: string[];
}

function buildTerritories(data: SoulMapData): Territory[] {
  return [
    {
      id: 'emotions',
      name: 'Emotions',
      cx: 22,
      cy: 22,
      r: 18,
      colors: ['#C9A0D0', '#9B6BA0', '#7A4A80'],
      intensity: Math.max(20, data.avgSlider),
      items: data.recentEmotions.slice(0, 3).map((e) => e.word),
    },
    {
      id: 'strengths',
      name: 'Strengths',
      cx: 50,
      cy: 38,
      r: 20,
      colors: ['#A8B888', '#7A8A50', '#4A6030'],
      intensity: Math.min(95, 30 + data.strengths.length * 15),
      items: data.strengths.slice(0, 3),
    },
    {
      id: 'fears',
      name: 'Fears',
      cx: 18,
      cy: 55,
      r: 14,
      colors: ['#E8A0A0', '#D45050', '#A03030'],
      intensity: Math.min(90, 20 + data.fears.length * 20),
      items: data.fears.slice(0, 2),
    },
    {
      id: 'vision',
      name: 'Vision',
      cx: 50,
      cy: 10,
      r: 16,
      colors: ['#88D0C8', '#3AA8A0', '#207870'],
      intensity: data.vision ? 65 : 15,
      items: data.vision ? [data.vision.slice(0, 35)] : [],
    },
    {
      id: 'energy',
      name: 'Energy',
      cx: 78,
      cy: 22,
      r: 16,
      colors: ['#F0B888', '#E0844A', '#C06030'],
      intensity: Math.min(80, 20 + data.energy.length * 15),
      items: data.energy.slice(0, 2),
    },
    {
      id: 'body',
      name: 'Body',
      cx: 80,
      cy: 55,
      r: 14,
      colors: ['#E8A8A0', '#D4605A', '#B04040'],
      intensity: data.body,
      items: data.body !== 50 ? [data.body > 60 ? 'Strong' : data.body < 40 ? 'Low' : 'OK'] : [],
    },
    {
      id: 'shadows',
      name: 'Shadows',
      cx: 35,
      cy: 70,
      r: 13,
      colors: ['#90A8B8', '#5A7A8A', '#3A5868'],
      intensity: Math.min(80, (data.fearCount + data.avoidanceCount + data.confusionCount) * 10),
      items: [
        data.avoidanceCount > 0 ? `Avoidance x${data.avoidanceCount}` : '',
        data.confusionCount > 0 ? `Confusion x${data.confusionCount}` : '',
      ].filter(Boolean),
    },
    {
      id: 'gratitude',
      name: 'Gratitude',
      cx: 65,
      cy: 70,
      r: 13,
      colors: ['#B0D898', '#7AAA58', '#508830'],
      intensity: Math.min(90, 15 + data.gratitudeCount * 25),
      items: data.gratitudeCount > 0 ? [`x${data.gratitudeCount}`] : [],
    },
  ];
}

export default function SoulMap({
  data,
  onSelectTerritory,
}: {
  data: SoulMapData;
  onSelectTerritory?: (id: string) => void;
}) {
  const territories = buildTerritories(data);
  const W = 100;
  const H = 85;

  return (
    <div className="space-y-2">
      <div
        className="rounded-2xl border border-border/30 overflow-hidden"
        style={{ background: '#F8F0E408' }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 'auto', minHeight: 280 }}
        >
          {/* Territories as layered circles */}
          {territories.map((t) => {
            const opacity = 0.12 + (t.intensity / 100) * 0.28;
            const [light, mid, dark] = t.colors;
            const hasContent = t.items.length > 0;
            return (
              <g key={t.id} className="cursor-pointer" onClick={() => onSelectTerritory?.(t.id)}>
                {/* 3 concentric circles — outer light, mid, inner dark */}
                <circle cx={t.cx} cy={t.cy} r={t.r * 1.1} fill={light} opacity={opacity * 0.5} />
                <circle cx={t.cx} cy={t.cy} r={t.r * 0.75} fill={mid} opacity={opacity * 0.7} />
                <circle cx={t.cx} cy={t.cy} r={t.r * 0.4} fill={dark} opacity={opacity * 0.9} />

                {/* Contour rings */}
                <circle
                  cx={t.cx}
                  cy={t.cy}
                  r={t.r * 0.9}
                  fill="none"
                  stroke={mid}
                  strokeWidth={0.3}
                  opacity={0.2}
                />
                <circle
                  cx={t.cx}
                  cy={t.cy}
                  r={t.r * 0.55}
                  fill="none"
                  stroke={dark}
                  strokeWidth={0.2}
                  opacity={0.25}
                />

                {/* Territory name */}
                <text
                  x={t.cx}
                  y={t.cy - (t.items.length > 0 ? t.items.length * 2.5 + 1 : 1)}
                  textAnchor="middle"
                  fill={hasContent ? dark : mid}
                  fontSize={3.8}
                  fontWeight={600}
                  fontFamily="var(--font-serif)"
                  letterSpacing="0.3"
                  opacity={hasContent ? 0.9 : 0.4}
                >
                  {t.name}
                </text>

                {/* Items — each on its own line below the name */}
                {t.items.map((item, i) => (
                  <text
                    key={item}
                    x={t.cx}
                    y={t.cy + 1 + i * 4}
                    textAnchor="middle"
                    fill={mid}
                    fontSize={2.8}
                    fontFamily="var(--font-handwritten)"
                    opacity={0.7}
                  >
                    {item}
                  </text>
                ))}
              </g>
            );
          })}

          {/* Chapter at bottom */}
          {data.chapter && (
            <text
              x={50}
              y={H - 3}
              textAnchor="middle"
              fill="#5C3018"
              fontSize={2.5}
              fontFamily="var(--font-serif)"
              opacity={0.25}
              letterSpacing="1"
            >
              {data.chapter.toUpperCase()}
            </text>
          )}

          {/* Archetype at top */}
          <text
            x={50}
            y={4}
            textAnchor="middle"
            fill="#5C3018"
            fontSize={2.5}
            fontFamily="var(--font-serif)"
            opacity={0.2}
            letterSpacing="0.8"
          >
            {data.archetype}
          </text>
        </svg>
      </div>
    </div>
  );
}
