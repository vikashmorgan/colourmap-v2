'use client';

import { ARCHETYPES, type Member } from '@/lib/collective/model';
import { linksBetween, sharedThemes } from '@/lib/collective/themes';

type Props = {
  members: Member[];
  selected: string[];
  onToggle: (id: string) => void;
};

const C = 500;
const MEMBER_R = 330;
const THEME_R = 140;

function around(i: number, n: number, r: number) {
  const a = -Math.PI / 2 + (i * Math.PI * 2) / Math.max(n, 1);
  return { x: C + Math.cos(a) * r, y: C + Math.sin(a) * r };
}

/** Splits a theme label after its '&' so neighbouring planet labels stay narrow and never collide. */
export function labelLines(name: string): string[] {
  const i = name.indexOf(' & ');
  return i < 0 ? [name] : [name.slice(0, i + 2), name.slice(i + 3)];
}

/** The group as a constellation: members as stars, shared intentions as planets in the middle. */
export default function CollectiveMap({ members, selected, onToggle }: Props) {
  const pos = new Map(members.map((m, i) => [m.id, around(i, members.length, MEMBER_R)]));
  const themes = sharedThemes(members);
  const themePos = new Map(
    themes.map((t, i) => [
      t.id,
      themes.length === 1 ? { x: C, y: C } : around(i, themes.length, THEME_R),
    ]),
  );
  const complements = linksBetween(members).filter((l) => l.kind === 'complement');
  const focus = selected.length > 0;
  const lit = (id: string) => !focus || selected.includes(id);

  return (
    <svg
      viewBox="0 0 1000 1000"
      className="h-full w-full"
      role="img"
      aria-label="Map of the group: each person is a star, shared intentions are planets in the middle"
    >
      <title>Collective map</title>
      <g fill="none" stroke="rgba(143,220,255,.08)">
        <circle cx={C} cy={C} r={MEMBER_R} />
        <circle cx={C} cy={C} r={THEME_R + 60} strokeDasharray="2 8" />
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const p = around(k, 6, 120);
          return <circle key={k} cx={p.x} cy={p.y} r={120} />;
        })}
      </g>
      {complements.map((l) => {
        const a = pos.get(l.a)!;
        const b = pos.get(l.b)!;
        const on = !focus || (selected.includes(l.a) && selected.includes(l.b));
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const qx = mx + (mx - C) * 0.35;
        const qy = my + (my - C) * 0.35;
        return (
          <path
            key={`${l.a}-${l.b}`}
            d={`M${a.x},${a.y} Q${qx},${qy} ${b.x},${b.y}`}
            fill="none"
            stroke="#8fdcff"
            strokeOpacity={on ? 0.6 : 0.08}
            strokeDasharray="3 7"
            strokeWidth={1.5}
          />
        );
      })}
      {themes.flatMap((t) =>
        t.who.map((id) => {
          const a = pos.get(id)!;
          const b = themePos.get(t.id)!;
          return (
            <line
              key={`${t.id}-${id}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#e8c27a"
              strokeOpacity={lit(id) ? 0.45 : 0.07}
              strokeWidth={1.2}
            />
          );
        }),
      )}
      {themes.map((t) => {
        const p = themePos.get(t.id)!;
        const on = !focus || t.who.some((id) => selected.includes(id));
        return (
          <g key={t.id} opacity={on ? 1 : 0.3}>
            <circle
              cx={p.x}
              cy={p.y}
              r={14 + t.who.length * 4}
              fill="rgba(232,194,122,.18)"
              stroke="#e8c27a"
            />
            <circle cx={p.x} cy={p.y} r={5} fill="#fff1cf" />
            <text
              x={p.x}
              y={p.y + 38 + t.who.length * 4}
              textAnchor="middle"
              fill="#efe6d2"
              style={{ fontFamily: 'var(--font-cowboy)', fontSize: 18, letterSpacing: '.08em' }}
            >
              {labelLines(t.name.toUpperCase()).map((line, i) => (
                <tspan key={line} x={p.x} dy={i === 0 ? 0 : 22}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
      {members.map((m) => {
        const p = pos.get(m.id)!;
        const on = lit(m.id);
        const isSel = selected.includes(m.id);
        const arch = ARCHETYPES.find((a) => a.id === m.archetype)?.name ?? '';
        return (
          // biome-ignore lint/a11y/useSemanticElements: an SVG star cannot be a <button>; it gets role, focus and keys
          <g
            key={m.id}
            role="button"
            tabIndex={0}
            aria-pressed={isSel}
            aria-label={`${m.name}, ${arch}`}
            onClick={() => onToggle(m.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle(m.id);
              }
            }}
            style={{ cursor: 'pointer', outline: 'none' }}
            opacity={on ? 1 : 0.35}
          >
            <circle cx={p.x} cy={p.y} r={70} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={58} fill={m.color} opacity={0.12} />
            <circle
              cx={p.x}
              cy={p.y}
              r={40}
              fill="rgba(10,14,28,.85)"
              stroke={m.color}
              strokeWidth={isSel ? 3 : 1.5}
            />
            <circle cx={p.x} cy={p.y} r={14} fill={m.color} opacity={0.85} />
            {isSel && (
              <circle
                cx={p.x}
                cy={p.y}
                r={50}
                fill="none"
                stroke={m.color}
                strokeDasharray="3 6"
                strokeWidth={1.5}
              />
            )}
            <text
              x={p.x}
              y={p.y + 78}
              textAnchor="middle"
              fill="#efe6d2"
              className="font-serif"
              style={{ fontSize: 30 }}
            >
              {m.name}
            </text>
            <text
              x={p.x}
              y={p.y + 102}
              textAnchor="middle"
              fill={m.color}
              style={{ fontFamily: 'var(--font-cowboy)', fontSize: 16, letterSpacing: '.14em' }}
            >
              {arch.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
