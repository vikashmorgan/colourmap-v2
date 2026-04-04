'use client';

import { useEffect, useState } from 'react';

interface InnerPart {
  id: string;
  name: string;
  color: string;
  needs: string;
  triggers: string;
  strength: number; // 0-100 how present this part is
}

const PART_COLORS = [
  '#9B6BA0',
  '#3A8AC4',
  '#E0844A',
  '#7AAA58',
  '#D4605A',
  '#C88820',
  '#3AA8A0',
  '#5A7A8A',
  '#D87048',
  '#7A6AB8',
];
const STORAGE_KEY = 'colourmap:personality-parts';

function loadParts(): InnerPart[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    /* */
  }
  return [];
}

export default function PersonalityMap() {
  const [parts, setParts] = useState<InnerPart[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PART_COLORS[0]);

  useEffect(() => {
    setParts(loadParts());
  }, []);

  function save(updated: InnerPart[]) {
    setParts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function addPart() {
    if (!newName.trim()) return;
    const part: InnerPart = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newName.trim(),
      color: newColor,
      needs: '',
      triggers: '',
      strength: 50,
    };
    save([...parts, part]);
    setNewName('');
    setAdding(false);
    setNewColor(PART_COLORS[(parts.length + 1) % PART_COLORS.length]);
    setExpandedId(part.id);
  }

  function updatePart(id: string, field: keyof InnerPart, value: string | number) {
    const updated = parts.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    save(updated);
  }

  function deletePart(id: string) {
    save(parts.filter((p) => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  // Compute contrasts and alignments
  const filledParts = parts.filter((p) => p.needs.trim() || p.triggers.trim());

  return (
    <div className="space-y-4">
      {/* Visual constellation */}
      {parts.length > 0 && (
        <div
          className="rounded-2xl border border-border/30 overflow-hidden"
          style={{ background: '#F8F0E406' }}
        >
          <svg viewBox="0 0 100 60" className="w-full" style={{ height: 'auto', minHeight: 180 }}>
            {/* Connection lines between parts */}
            {parts.map((a, i) =>
              parts.slice(i + 1).map((b, j) => {
                const ax = 15 + (i % 4) * 22;
                const ay = 15 + Math.floor(i / 4) * 25;
                const bx = 15 + ((i + j + 1) % 4) * 22;
                const by = 15 + Math.floor((i + j + 1) / 4) * 25;
                return (
                  <line
                    key={`${a.id}-${b.id}`}
                    x1={ax}
                    y1={ay}
                    x2={bx}
                    y2={by}
                    stroke="#C4A060"
                    strokeWidth={0.2}
                    opacity={0.1}
                  />
                );
              }),
            )}
            {/* Part circles */}
            {parts.map((part, i) => {
              const cx = 15 + (i % 4) * 22;
              const cy = 15 + Math.floor(i / 4) * 25;
              const r = 4 + (part.strength / 100) * 5;
              const isExpanded = expandedId === part.id;
              return (
                <g
                  key={part.id}
                  className="cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : part.id)}
                >
                  <circle cx={cx} cy={cy} r={r + 2} fill={part.color} opacity={0.08} />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={part.color}
                    opacity={isExpanded ? 0.5 : 0.25}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 0.5}
                    fill={part.color}
                    opacity={isExpanded ? 0.7 : 0.35}
                  />
                  <text
                    x={cx}
                    y={cy + r + 5}
                    textAnchor="middle"
                    fill={part.color}
                    fontSize={2.8}
                    fontWeight={600}
                    fontFamily="var(--font-serif)"
                    opacity={isExpanded ? 0.9 : 0.5}
                  >
                    {part.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Parts list */}
      <div className="space-y-2">
        {parts.map((part) => {
          const isExpanded = expandedId === part.id;
          return (
            <div key={part.id}>
              {!isExpanded ? (
                <button
                  type="button"
                  onClick={() => setExpandedId(part.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all"
                  style={{ background: `${part.color}06`, border: `1px solid ${part.color}12` }}
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: part.color, opacity: 0.7 }}
                  />
                  <span
                    className="text-xs font-medium flex-1 text-left"
                    style={{ color: `${part.color}cc` }}
                  >
                    {part.name}
                  </span>
                  {/* Strength bar */}
                  <div
                    className="w-12 h-1.5 rounded-full overflow-hidden"
                    style={{ background: `${part.color}10` }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${part.strength}%`, background: part.color, opacity: 0.5 }}
                    />
                  </div>
                </button>
              ) : (
                <div
                  className="rounded-2xl border p-4 space-y-3 animate-in fade-in duration-150"
                  style={{ borderColor: `${part.color}30`, background: `${part.color}05` }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ background: part.color, opacity: 0.7 }}
                      />
                      <input
                        type="text"
                        value={part.name}
                        onChange={(e) => updatePart(part.id, 'name', e.target.value)}
                        className="text-sm font-semibold font-serif bg-transparent outline-none"
                        style={{ color: part.color }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(null)}
                      className="text-xs text-muted-foreground/30 hover:text-muted-foreground"
                    >
                      x
                    </button>
                  </div>

                  {/* Strength slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-muted-foreground/40">
                        How present is this part?
                      </span>
                      <span className="text-[10px] font-medium" style={{ color: part.color }}>
                        {part.strength}%
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[0, 20, 40, 60, 80, 100].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => updatePart(part.id, 'strength', v)}
                          className="h-3 flex-1 rounded-sm transition-all"
                          style={{
                            background: part.color,
                            opacity: v <= part.strength ? 0.15 + (v / 100) * 0.5 : 0.05,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Needs */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium" style={{ color: `${part.color}80` }}>
                      What does this part need?
                    </p>
                    <input
                      type="text"
                      value={part.needs}
                      onChange={(e) => updatePart(part.id, 'needs', e.target.value)}
                      placeholder="Freedom, recognition, rest, excitement..."
                      className="w-full rounded-lg border px-3 py-2 text-xs outline-none placeholder:text-muted-foreground/25"
                      style={{ borderColor: `${part.color}15`, background: `${part.color}03` }}
                    />
                  </div>

                  {/* Triggers */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium" style={{ color: `${part.color}80` }}>
                      What triggers this part?
                    </p>
                    <input
                      type="text"
                      value={part.triggers}
                      onChange={(e) => updatePart(part.id, 'triggers', e.target.value)}
                      placeholder="Boredom, pressure, loneliness, success..."
                      className="w-full rounded-lg border px-3 py-2 text-xs outline-none placeholder:text-muted-foreground/25"
                      style={{ borderColor: `${part.color}15`, background: `${part.color}03` }}
                    />
                  </div>

                  {/* Delete */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => deletePart(part.id)}
                      className="text-[9px] text-muted-foreground/25 hover:text-destructive transition-colors"
                    >
                      delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add part */}
      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all"
          style={{ border: '1px dashed #C4A06020', color: '#C4A06060' }}
        >
          <span className="text-xs">+ name a part of you</span>
        </button>
      ) : (
        <div className="rounded-xl border border-border/40 p-4 space-y-3 animate-in fade-in duration-150">
          <p className="text-xs font-medium" style={{ color: '#5C3018' }}>
            Name a part of yourself
          </p>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addPart();
            }}
            placeholder="The Party Animal, The Perfectionist, The Dreamer..."
            className="w-full rounded-lg border border-border/20 bg-background/40 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/30"
          />
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {PART_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className="h-5 w-5 rounded-full transition-all hover:scale-110"
                  style={{
                    background: c,
                    opacity: newColor === c ? 1 : 0.25,
                    outline: newColor === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addPart}
              disabled={!newName.trim()}
              className="text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-30"
              style={{ color: newColor, background: `${newColor}10` }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewName('');
              }}
              className="text-xs text-muted-foreground/40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Overview — contrasts and alignments */}
      {filledParts.length >= 2 && (
        <div className="rounded-xl border border-border/30 p-4 space-y-3">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">Overview</p>

          {/* Needs map */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground/50">What your parts need</p>
            <div className="flex flex-wrap gap-1.5">
              {filledParts
                .filter((p) => p.needs.trim())
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                    style={{ background: `${p.color}08`, border: `1px solid ${p.color}15` }}
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ background: p.color, opacity: 0.6 }}
                    />
                    <span className="text-[10px]" style={{ color: `${p.color}90` }}>
                      {p.needs}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Strength ranking */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground/50">Presence right now</p>
            {[...parts]
              .sort((a, b) => b.strength - a.strength)
              .map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-[10px] w-20 truncate" style={{ color: `${p.color}90` }}>
                    {p.name}
                  </span>
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: `${p.color}08` }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${p.strength}%`, background: p.color, opacity: 0.4 }}
                    />
                  </div>
                  <span className="text-[9px] w-6 text-right text-muted-foreground/30">
                    {p.strength}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
