'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import BackOfMind from '@/components/BackOfMind';
import CheckInForm from '@/components/CheckInForm';
import CheckInHistory from '@/components/CheckInHistory';
import CockpitCat from '@/components/CockpitCat';
import CockpitSections from '@/components/CockpitSection';
import CollapsibleCard from '@/components/CollapsibleCard';
import EnergyMap from '@/components/EnergyMap';
import MissionTracker from '@/components/MissionTracker';
import TodaySummary from '@/components/TodaySummary';
import { useViewMode } from '@/components/ViewModeContext';

interface MissionSummary {
  id: string;
  title: string;
}

const DEFAULT_LEFT = ['check-in', 'history'];
const DEFAULT_RIGHT = ['energy', 'mission', 'cat', 'back-of-mind', 'programs'];
const STORAGE_KEY = 'colourmap:cockpit-layout';

const ALL_ITEMS = [...DEFAULT_LEFT, ...DEFAULT_RIGHT];

function loadLayout(): { left: string[]; right: string[] } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as { left: string[]; right: string[] };
      // Add any new items that weren't in saved layout
      const existing = new Set([...parsed.left, ...parsed.right]);
      for (const id of ALL_ITEMS) {
        if (!existing.has(id)) parsed.left.push(id);
      }
      // Remove items that no longer exist
      parsed.left = parsed.left.filter((id) => ALL_ITEMS.includes(id));
      parsed.right = parsed.right.filter((id) => ALL_ITEMS.includes(id));
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return { left: DEFAULT_LEFT, right: DEFAULT_RIGHT };
}

export default function CockpitPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [layout, setLayout] = useState({ left: DEFAULT_LEFT, right: DEFAULT_RIGHT });
  const [cockpitOpen, setCockpitOpen] = useState(false);
  const [bomOpen, setBomOpen] = useState(false);
  const dragFrom = useRef<{ col: 'left' | 'right'; idx: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ col: 'left' | 'right'; idx: number } | null>(null);

  useEffect(() => {
    setLayout(loadLayout());
    if (window.location.hash === '#cockpit') {
      setCockpitOpen(true);
      setTimeout(() => {
        document.getElementById('cockpit')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  function saveLayout(next: { left: string[]; right: string[] }) {
    setLayout(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function handleDrop(toCol: 'left' | 'right', toIdx: number) {
    if (!dragFrom.current) return;
    const { col: fromCol, idx: fromIdx } = dragFrom.current;
    const next = { left: [...layout.left], right: [...layout.right] };
    const [moved] = next[fromCol].splice(fromIdx, 1);
    const insertIdx = fromCol === toCol && fromIdx < toIdx ? toIdx - 1 : toIdx;
    next[toCol].splice(insertIdx, 0, moved);
    saveLayout(next);
    dragFrom.current = null;
    setDragOver(null);
  }

  const fetchMissions = useCallback(async () => {
    try {
      const res = await fetch('/api/missions');
      if (res.ok) {
        const data = await res.json();
        setMissions(
          data
            .filter((m: { completed: boolean }) => !m.completed)
            .map((m: { id: string; title: string }) => ({ id: m.id, title: m.title })),
        );
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const boxes: Record<string, React.ReactNode> = {
    'check-in': (
      <CollapsibleCard title="Check In" defaultOpen>
        <CheckInForm missions={missions} onCheckInComplete={() => setRefreshKey((k) => k + 1)} />
      </CollapsibleCard>
    ),
    history: <CheckInHistory refreshKey={refreshKey} missions={missions} />,
    energy: (
      <CollapsibleCard title="Day Map" defaultOpen>
        <EnergyMap />
      </CollapsibleCard>
    ),
    mission: (
      <CollapsibleCard title="Current Missions" defaultOpen>
        <MissionTracker onMissionsChange={fetchMissions} refreshKey={refreshKey} />
      </CollapsibleCard>
    ),
    cat: <CockpitCat />,
    'back-of-mind': (
      <CollapsibleCard title="Checklist">
        <BackOfMind />
      </CollapsibleCard>
    ),
    programs: <CockpitSections />,
  };

  function renderColumn(col: 'left' | 'right') {
    const items = layout[col];
    return (
      <div className="space-y-4">
        {items.map((id) => (
          <div key={id}>{boxes[id]}</div>
        ))}
      </div>
    );
  }

  const { mode } = useViewMode();
  const isPhone = mode === 'phone';

  return (
    <main className={isPhone ? 'space-y-6' : 'space-y-10'}>
      {isPhone ? (
        <>
          {/* Check In */}
          <div>
            <CheckInForm
              missions={missions}
              onCheckInComplete={() => setRefreshKey((k) => k + 1)}
            />
          </div>

          {/* Diamond divider */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex-1 h-px bg-[#E0844A]/15" />
            <div
              className="h-2.5 w-2.5 rotate-45 rounded-[1px]"
              style={{ background: '#E0844A', opacity: 0.3 }}
            />
            <div className="flex-1 h-px bg-[#E0844A]/15" />
          </div>

          {/* Cockpit — right after check-in */}
          <div id="cockpit" className="rounded-2xl border border-border bg-card/80 overflow-hidden">
            <button
              type="button"
              onClick={() => setCockpitOpen(!cockpitOpen)}
              className="w-full px-4 py-3 text-[15px] font-normal tracking-[0.08em] text-center transition-colors hover:bg-card font-serif"
            >
              Cockpit
            </button>
            {cockpitOpen && (
              <div className="px-4 pb-4 space-y-4 animate-in fade-in duration-200">
                <MissionTracker onMissionsChange={fetchMissions} refreshKey={refreshKey} />

                <div className="flex items-center justify-center">
                  <div
                    className="h-1.5 w-1.5 rotate-45 rounded-[0.5px]"
                    style={{ background: '#C4A060', opacity: 0.2 }}
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setBomOpen(!bomOpen)}
                    className="w-full rounded-xl border border-border/50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-center text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                  >
                    Checklist
                  </button>
                  {bomOpen && (
                    <div className="pt-3 animate-in fade-in duration-150">
                      <BackOfMind />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center">
                  <div
                    className="h-1.5 w-1.5 rotate-45 rounded-[0.5px]"
                    style={{ background: '#C4A060', opacity: 0.2 }}
                  />
                </div>

                <CockpitSections />
              </div>
            )}
          </div>

          {/* Diamond divider */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex-1 h-px bg-[#C4A060]/15" />
            <div
              className="h-2.5 w-2.5 rotate-45 rounded-[1px]"
              style={{ background: '#C4A060', opacity: 0.2 }}
            />
            <div className="flex-1 h-px bg-[#C4A060]/15" />
          </div>

          {/* Day Map */}
          <EnergyMap />

          {/* Diamond divider */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex-1 h-px bg-[#C4A060]/15" />
            <div
              className="h-2.5 w-2.5 rotate-45 rounded-[1px]"
              style={{ background: '#C4A060', opacity: 0.2 }}
            />
            <div className="flex-1 h-px bg-[#C4A060]/15" />
          </div>

          {/* Recent */}
          <CheckInHistory refreshKey={refreshKey} missions={missions} />
        </>
      ) : (
        <>
        <section className="grid gap-4 md:grid-cols-2">
          {(['left', 'right'] as const).map((col) => (
            <div
              key={col}
              className="space-y-4"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver({ col, idx: layout[col].length });
              }}
              onDrop={() => handleDrop(col, layout[col].length)}
            >
              {layout[col].map((id, idx) => (
                <div
                  key={id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver({ col, idx });
                  }}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleDrop(col, idx);
                  }}
                  className={
                    dragOver?.col === col &&
                    dragOver?.idx === idx &&
                    dragFrom.current &&
                    !(dragFrom.current.col === col && dragFrom.current.idx === idx)
                      ? 'border-t-2 border-[#C4A060]/50 pt-1'
                      : ''
                  }
                >
                  <div
                    draggable
                    onDragStart={(e) => {
                      const target = e.target as HTMLElement;
                      const isInteractive = target.closest('input, textarea, button, [data-no-drag], [style*="touch-action"]');
                      if (isInteractive) { e.preventDefault(); return; }
                      dragFrom.current = { col, idx };
                    }}
                    onDragEnd={() => { dragFrom.current = null; setDragOver(null); }}
                  >
                    {boxes[id]}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>

        </>
      )}
    </main>
  );
}
