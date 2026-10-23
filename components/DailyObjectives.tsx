'use client';

import { useEffect, useState } from 'react';
import type { CompassAxis, LifeCategoryLike } from '@/components/CategoryTagPicker';
import CategoryTagPicker from '@/components/CategoryTagPicker';
import MicDot from '@/components/MicDot';
import { useSpellCheck } from '@/lib/hooks/use-spell-check';

/* ═══════════════════════════════════════════════════════════
   DAILY OBJECTIVES — today's list + push for tomorrow.
   Lives in the Doing tab. Synced with /api/daily-objectives.
   ═══════════════════════════════════════════════════════════ */

const COMPASS_AXES: CompassAxis[] = [
  { name: 'Care', color: '#D4805A', group: 'Feeling' },
  { name: 'Attitude', color: '#C4A070', group: 'Feeling' },
  { name: 'Rest', color: '#C4906A', group: 'Feeling' },
  { name: 'Emotions', color: '#B07A5A', group: 'Feeling' },
  { name: 'Clarity', color: '#7AAA58', group: 'Doing' },
  { name: 'Target', color: '#7A9A7A', group: 'Doing' },
  { name: 'Resources', color: '#8AB0A0', group: 'Doing' },
  { name: 'Action', color: '#9AB090', group: 'Doing' },
  { name: 'Voice', color: '#6B7F4E', group: 'Sharing' },
  { name: 'Listen', color: '#8CA46E', group: 'Sharing' },
  { name: 'Bond', color: '#7B9560', group: 'Sharing' },
  { name: 'Boundary', color: '#5F7447', group: 'Sharing' },
];

type TodoStatus = 'active' | 'waiting';
type TodoItem = {
  id: string;
  text: string;
  done: boolean;
  notes?: string;
  ease?: number;
  weight?: number;
  urgency?: number;
  status?: TodoStatus;
  tag?: { name: string; color: string; categoryId?: string };
};

const STATUS_CONFIG: Record<TodoStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: '#7AAA58' },
  waiting: { label: 'Waiting for reply', color: '#A08060' },
};

const LIGHT_PILL_TEXT = 'var(--light-pill-text, var(--light-surface-text, #5C3018))';
const LIGHT_PILL_MUTED = 'var(--light-pill-muted, var(--light-surface-muted, #7A5438))';

const EASE_LABELS = ['', 'Complex', 'Hard', 'Medium', 'Doable', 'Easy'];
const EASE_COLORS = ['#E0844A', '#D8C078', '#C0D088', '#A0C8A0', '#7AAA58'];
const WEIGHT_LABELS = ['', 'Light', 'Mild', 'Present', 'Heavy', 'Crushing'];
const WEIGHT_COLORS = ['#A0B0D0', '#90C0C0', '#D8C078', '#E8A878', '#E0908A'];
const URGENCY_LABELS = ['', 'No rush', 'When you can', 'This week', 'Soon', 'Finish now'];
const URGENCY_COLORS = ['#A0C8A0', '#C0D088', '#D8C078', '#E8A060', '#D06040'];

export default function DailyObjectives() {
  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem('colourmap:other-missions-open');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [pushTomorrowOpen, setPushTomorrowOpen] = useState(true);
  const [doneOpen, setDoneOpen] = useState(false);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('colourmap:other-missions-open', String(next));
      } catch {}
      return next;
    });
  };

  // Section label renaming — shared localStorage key with FeelingCheckInCard
  const [sectionLabels, setSectionLabels] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('colourmap:section-labels');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });
  const [renamingSection, setRenamingSection] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  function sectionLabel(key: string, fallback: string) {
    return sectionLabels[key] || fallback;
  }

  function commitRename(key: string, fallback: string) {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== fallback) {
      const next = { ...sectionLabels, [key]: trimmed };
      setSectionLabels(next);
      try {
        localStorage.setItem('colourmap:section-labels', JSON.stringify(next));
      } catch {}
    }
    setRenamingSection(null);
  }

  // Today objectives
  const [todayObjectives, setTodayObjectives] = useState<TodoItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('colourmap:today-objectives') || '[]');
    } catch {
      return [];
    }
  });
  const [todayInput, setTodayInput] = useState('');
  const [expandedTodayId, setExpandedTodayId] = useState<string | null>(null);
  const [renamingObjId, setRenamingObjId] = useState<string | null>(null);
  const [renameObjValue, setRenameObjValue] = useState('');
  const [objTagPickerId, setObjTagPickerId] = useState<string | null>(null);
  const [slidersOpenId, setSlidersOpenId] = useState<string | null>(null);
  const [draggedTodayId, setDraggedTodayId] = useState<string | null>(null);
  const [dragOverTodayId, setDragOverTodayId] = useState<string | null>(null);
  const [noteSpell, toggleNoteSpell] = useSpellCheck();

  const persistTodayObjectives = (next: TodoItem[]) => {
    setTodayObjectives(next);
    try {
      localStorage.setItem('colourmap:today-objectives', JSON.stringify(next));
    } catch {}
  };

  const addTodayObjective = () => {
    const text = todayInput.trim();
    if (!text) return;
    persistTodayObjectives([...todayObjectives, { id: crypto.randomUUID(), text, done: false }]);
    setTodayInput('');
    fetch('/api/daily-objectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, list: 'today' }),
    }).catch(() => {});
  };

  const toggleTodayObjective = (id: string) => {
    const item = todayObjectives.find((t) => t.id === id);
    persistTodayObjectives(todayObjectives.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    fetch(`/api/daily-objectives/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: item ? !item.done : true }),
    }).catch(() => {});
  };

  const removeTodayObjective = (id: string) => {
    persistTodayObjectives(todayObjectives.filter((t) => t.id !== id));
    fetch(`/api/daily-objectives/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const reorderTodayObjectives = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIdx = todayObjectives.findIndex((o) => o.id === fromId);
    const toIdx = todayObjectives.findIndex((o) => o.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...todayObjectives];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    persistTodayObjectives(next);
  };

  const updateTodayField = (id: string, field: string, value: string | number) => {
    persistTodayObjectives(
      todayObjectives.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  const updateTodayTag = (
    id: string,
    tag: { name: string; color: string; categoryId?: string } | null,
  ) => {
    persistTodayObjectives(
      todayObjectives.map((t) => (t.id === id ? { ...t, tag: tag || undefined } : t)),
    );
  };

  const updateTodayNotes = (id: string, notes: string) => {
    const next = todayObjectives.map((t) => (t.id === id ? { ...t, notes } : t));
    setTodayObjectives(next);
    try {
      localStorage.setItem('colourmap:today-objectives', JSON.stringify(next));
    } catch {}
  };

  // Push for tomorrow
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('colourmap:checkin-todos') || '[]');
    } catch {
      return [];
    }
  });
  const [todoInput, setTodoInput] = useState('');
  const [expandedTodoId, setExpandedTodoId] = useState<string | null>(null);
  const [renamingTodoId, setRenamingTodoId] = useState<string | null>(null);
  const [renameTodoValue, setRenameTodoValue] = useState('');
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);

  const persistTodos = (next: TodoItem[]) => {
    setTodos(next);
    try {
      localStorage.setItem('colourmap:checkin-todos', JSON.stringify(next));
    } catch {}
  };

  const addTodo = () => {
    const text = todoInput.trim();
    if (!text) return;
    persistTodos([...todos, { id: crypto.randomUUID(), text, done: false }]);
    setTodoInput('');
    fetch('/api/daily-objectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, list: 'tomorrow' }),
    }).catch(() => {});
  };

  const toggleTodo = (id: string) => {
    const item = todos.find((t) => t.id === id);
    persistTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    fetch(`/api/daily-objectives/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: item ? !item.done : true }),
    }).catch(() => {});
  };

  const removeTodo = (id: string) => {
    persistTodos(todos.filter((t) => t.id !== id));
    fetch(`/api/daily-objectives/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const reorderTodos = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIdx = todos.findIndex((t) => t.id === fromId);
    const toIdx = todos.findIndex((t) => t.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...todos];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    persistTodos(next);
  };

  const moveToPush = (text: string, id: string) => {
    persistTodos([...todos, { id: crypto.randomUUID(), text, done: false }]);
    persistTodayObjectives(todayObjectives.filter((t) => t.id !== id));
  };

  const moveToDaily = (text: string, id: string) => {
    persistTodayObjectives([...todayObjectives, { id: crypto.randomUUID(), text, done: false }]);
    persistTodos(todos.filter((t) => t.id !== id));
  };

  const updateTodoField = (id: string, field: string, value: string | number) => {
    persistTodos(todos.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const updateTodoTag = (
    id: string,
    tag: { name: string; color: string; categoryId?: string } | null,
  ) => {
    persistTodos(todos.map((t) => (t.id === id ? { ...t, tag: tag || undefined } : t)));
  };

  // Done objectives history — read-only snapshot
  type DoneObjective = { id: string; text: string; completedAt: string };
  const [doneObjectives] = useState<DoneObjective[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('colourmap:done-objectives') || '[]');
    } catch {
      return [];
    }
  });

  // Life categories for tag picker
  const [lifeCategories, setLifeCategories] = useState<LifeCategoryLike[]>(() => {
    try {
      const raw = localStorage.getItem('colourmap:life-categories');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // API sync on mount
  useEffect(() => {
    fetch('/api/daily-objectives')
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error();
      })
      .then((data: { id: string; text: string; done: boolean; list: string; notes?: string }[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const today = data
          .filter((d) => d.list === 'today')
          .map((d) => ({ id: d.id, text: d.text, done: d.done, notes: d.notes }));
        const tomorrow = data
          .filter((d) => d.list === 'tomorrow')
          .map((d) => ({ id: d.id, text: d.text, done: d.done }));
        if (today.length > 0) {
          setTodayObjectives(today);
          localStorage.setItem('colourmap:today-objectives', JSON.stringify(today));
        }
        if (tomorrow.length > 0) {
          setTodos(tomorrow);
          localStorage.setItem('colourmap:checkin-todos', JSON.stringify(tomorrow));
        }
      })
      .catch(() => {});

    fetch('/api/life-categories')
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error();
      })
      .then((data: LifeCategoryLike[]) => {
        if (Array.isArray(data) && data.length > 0) setLifeCategories(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-3 px-0 py-1">
      {/* Header pill — same as Agenda */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={toggleOpen}
          className="flex cursor-pointer items-center gap-2 rounded-full px-5 py-1.5 transition-all"
          style={{ background: '#C4A06015', border: '1px solid #C4A06040' }}
        >
          <span
            className="text-center uppercase"
            style={{
              color: 'var(--light-surface-text, #5C3018)',
              fontSize: '17px',
              fontWeight: 700,
              letterSpacing: '0.22em',
            }}
          >
            {renamingSection === 'other' ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitRename('other', 'Daily Objectives')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename('other', 'Daily Objectives');
                  if (e.key === 'Escape') setRenamingSection(null);
                }}
                autoFocus
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                className="bg-transparent text-center uppercase outline-none border-b"
                style={{
                  color: 'var(--light-surface-text, #5C3018)',
                  fontSize: '17px',
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  borderColor: '#C4A06040',
                }}
              />
            ) : (
              <span
                className="cursor-pointer"
                onDoubleClick={() => {
                  setRenamingSection('other');
                  setRenameValue(sectionLabel('other', 'Daily Objectives'));
                }}
                title="Double-click to rename"
              >
                {sectionLabel('other', 'Daily Objectives')}
              </span>
            )}
          </span>
          <span
            className="text-sm transition-transform duration-200"
            style={{
              color: 'var(--light-surface-muted, #7A5438)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▾
          </span>
        </button>
      </div>

      {open && (
        <>
          {/* Add objective — above the list */}
          <div className="flex items-end gap-2">
            <input
              type="text"
              value={todayInput}
              onChange={(e) => setTodayInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTodayObjective();
              }}
              placeholder="add an objective for today..."
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              className="flex-1 border-b bg-transparent pb-1 outline-none text-center placeholder:text-[#7A5438] placeholder:opacity-40"
              style={{
                color: '#7a5438',
                borderColor: '#C4A06020',
                fontFamily: 'var(--font-handwritten)',
                fontSize: '24px',
                fontWeight: 700,
              }}
            />
            <MicDot
              visible={todayInput.length > 0}
              value={todayInput}
              onTranscript={setTodayInput}
            />
            <button
              type="button"
              onClick={addTodayObjective}
              className="shrink-0 cursor-pointer rounded-full transition-all hover:opacity-80"
              style={{
                width: 32,
                height: 32,
                background: todayInput.trim() ? '#C4A060' : '#C4A06025',
                border: '1.5px solid #C4A06050',
                color: todayInput.trim() ? '#fff' : LIGHT_PILL_MUTED,
                fontSize: 22,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              +
            </button>
          </div>

          {/* Today objectives — drag-and-drop drop zone */}
          <div
            className="space-y-1.5 transition-all"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.from === 'push' && data.text) moveToDaily(data.text, data.id);
              } catch {}
            }}
          >
            {todayObjectives
              .filter((o) => !o.done)
              .map((o) => {
                const isExpanded = expandedTodayId === o.id;
                const isDragging = draggedTodayId === o.id;
                const isDropTarget = dragOverTodayId === o.id && draggedTodayId !== o.id;
                return (
                  <div
                    key={o.id}
                    className="space-y-1"
                    draggable
                    onDragStart={(e) => {
                      setDraggedTodayId(o.id);
                      e.dataTransfer.setData(
                        'text/plain',
                        JSON.stringify({ from: 'daily', id: o.id, text: o.text }),
                      );
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedTodayId !== null && draggedTodayId !== o.id)
                        setDragOverTodayId(o.id);
                    }}
                    onDragLeave={(e) => {
                      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                        setDragOverTodayId((prev) => (prev === o.id ? null : prev));
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedTodayId !== null) reorderTodayObjectives(draggedTodayId, o.id);
                      setDraggedTodayId(null);
                      setDragOverTodayId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedTodayId(null);
                      setDragOverTodayId(null);
                    }}
                    style={{
                      opacity: isDragging ? 0.4 : 1,
                      borderTop: isDropTarget ? '2px solid #C4A060' : '2px solid transparent',
                      cursor: 'grab',
                      transition: 'opacity 120ms, border-color 120ms',
                    }}
                  >
                    <div className="group flex items-start gap-2">
                      {/* Done — pill, ochre */}
                      <button
                        type="button"
                        onClick={() => toggleTodayObjective(o.id)}
                        title={o.done ? 'Mark as not done' : 'Mark as done'}
                        className="shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition-all hover:opacity-80"
                        style={{
                          background: o.done ? '#C4A060' : '#C4A06015',
                          border: '1px solid #C4A06050',
                          color: o.done ? '#fff' : LIGHT_PILL_TEXT,
                          minWidth: 52,
                        }}
                      >
                        done
                      </button>
                      {!o.done && o.status && o.status !== 'active' && (
                        <span
                          className="block shrink-0 rounded-full"
                          style={{ width: 7, height: 7, background: STATUS_CONFIG[o.status].color }}
                          title={STATUS_CONFIG[o.status].label}
                        />
                      )}
                      {renamingObjId === o.id ? (
                        <input
                          type="text"
                          value={renameObjValue}
                          onChange={(e) => setRenameObjValue(e.target.value)}
                          onBlur={() => {
                            const trimmed = renameObjValue.trim();
                            if (trimmed && trimmed !== o.text)
                              updateTodayField(o.id, 'text', trimmed);
                            setRenamingObjId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const trimmed = renameObjValue.trim();
                              if (trimmed && trimmed !== o.text)
                                updateTodayField(o.id, 'text', trimmed);
                              setRenamingObjId(null);
                            }
                            if (e.key === 'Escape') setRenamingObjId(null);
                          }}
                          autoFocus
                          spellCheck={false}
                          autoCorrect="off"
                          autoCapitalize="off"
                          className="flex-1 bg-transparent text-center outline-none border-b"
                          style={{
                            color: '#7a5438',
                            fontFamily: 'var(--font-handwritten)',
                            fontSize: '20px',
                            borderColor: '#C4A06040',
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpandedTodayId(isExpanded ? null : o.id)}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setRenamingObjId(o.id);
                            setRenameObjValue(o.text);
                          }}
                          className="min-w-0 flex-1 cursor-pointer bg-transparent text-center"
                          style={{
                            color: o.done
                              ? LIGHT_PILL_MUTED
                              : o.status === 'waiting'
                                ? '#A08060'
                                : '#7a5438',
                            fontFamily: 'var(--font-handwritten)',
                            fontSize: '20px',
                            opacity: o.done ? 0.5 : o.status === 'waiting' ? 0.5 : 1,
                            border: 'none',
                            fontStyle: o.status === 'waiting' ? 'italic' : 'normal',
                            lineHeight: 1.18,
                            overflowWrap: 'anywhere',
                            whiteSpace: 'normal',
                          }}
                          title="Click to expand · Double-click to rename"
                        >
                          {o.text}
                          {o.status === 'waiting' && (
                            <span
                              className="ml-2 text-xs"
                              style={{ color: '#A08060', fontStyle: 'italic' }}
                            >
                              waiting
                            </span>
                          )}
                          {o.notes && o.notes.trim().length > 0 && !isExpanded && (
                            <span
                              className="ml-2 text-xs no-underline"
                              style={{ color: LIGHT_PILL_MUTED }}
                            >
                              ·
                            </span>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTodayObjective(o.id)}
                        title="Remove"
                        className="cursor-pointer text-sm opacity-0 transition-opacity group-hover:opacity-40"
                        style={{ color: '#7a5438', background: 'none', border: 'none' }}
                      >
                        ✕
                      </button>
                    </div>
                    {isExpanded && (
                      <>
                        <div style={{ position: 'relative' }}>
                          <textarea
                            value={o.notes || ''}
                            onChange={(e) => updateTodayNotes(o.id, e.target.value)}
                            placeholder="advancements, next steps..."
                            rows={2}
                            spellCheck={noteSpell}
                            autoCorrect="off"
                            className="ml-[60px] w-[calc(100%-3.75rem)] resize-none border-b bg-transparent pb-1 pt-0.5 outline-none placeholder:text-[#7A5438] placeholder:opacity-50 animate-in fade-in duration-150"
                            style={{
                              color: '#7a5438',
                              borderColor: '#C4A06025',
                              fontFamily: 'var(--font-handwritten)',
                              fontSize: '17px',
                              lineHeight: 1.4,
                            }}
                          />
                          <button
                            type="button"
                            onClick={toggleNoteSpell}
                            title={
                              noteSpell
                                ? 'Spell check on — click to turn off'
                                : 'Spell check off — click to turn on'
                            }
                            style={{
                              position: 'absolute',
                              right: 0,
                              bottom: 6,
                              fontFamily: 'var(--font-serif)',
                              fontSize: 9,
                              color: '#8A6A4A',
                              opacity: noteSpell ? 0.65 : 0.22,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              letterSpacing: '0.08em',
                              padding: 0,
                            }}
                          >
                            abc
                          </button>
                        </div>
                        <div className="ml-[60px] pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateTodayField(
                                o.id,
                                'status',
                                o.status === 'waiting' ? 'active' : 'waiting',
                              )
                            }
                            className="flex cursor-pointer items-center gap-2 transition-all"
                            style={{ background: 'none', border: 'none' }}
                          >
                            <span
                              className="block rounded-full"
                              style={{
                                width: 10,
                                height: 10,
                                background: o.status === 'waiting' ? '#A08060' : '#7AAA58',
                              }}
                            />
                            <span
                              style={{
                                fontFamily: 'var(--font-serif)',
                                fontSize: '12px',
                                color: o.status === 'waiting' ? '#A08060' : '#7AAA58',
                                fontWeight: 600,
                              }}
                            >
                              {o.status === 'waiting' ? 'Waiting for reply' : 'Active'}
                            </span>
                          </button>
                        </div>
                        <div className="ml-[60px] pt-1">
                          <CategoryTagPicker
                            value={o.tag || null}
                            onChange={(tag) => updateTodayTag(o.id, tag)}
                            open={objTagPickerId === o.id}
                            onToggle={() =>
                              setObjTagPickerId(objTagPickerId === o.id ? null : o.id)
                            }
                            onClose={() => setObjTagPickerId(null)}
                            lifeCategories={lifeCategories}
                            compassAxes={COMPASS_AXES}
                          />
                        </div>
                        {/* Ease / Weight / Urgency */}
                        {(() => {
                          const hasValues =
                            (o.ease || 0) > 0 || (o.weight || 0) > 0 || (o.urgency || 0) > 0;
                          const isSliderOpen = slidersOpenId === o.id;
                          if (hasValues && !isSliderOpen) {
                            return (
                              <button
                                type="button"
                                onClick={() => setSlidersOpenId(o.id)}
                                className="ml-[60px] flex cursor-pointer flex-wrap items-center gap-3 pt-2 pb-1 transition-all"
                                style={{ background: 'none', border: 'none' }}
                              >
                                {(o.ease || 0) > 0 && (
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className="block rounded-full"
                                      style={{
                                        width: 8,
                                        height: 8,
                                        background: EASE_COLORS[(o.ease || 1) - 1],
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontFamily: 'var(--font-serif)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: EASE_COLORS[(o.ease || 1) - 1],
                                      }}
                                    >
                                      {EASE_LABELS[o.ease || 0]}
                                    </span>
                                  </span>
                                )}
                                {(o.weight || 0) > 0 && (
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className="block rounded-full"
                                      style={{
                                        width: 8,
                                        height: 8,
                                        background: WEIGHT_COLORS[(o.weight || 1) - 1],
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontFamily: 'var(--font-serif)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: WEIGHT_COLORS[(o.weight || 1) - 1],
                                      }}
                                    >
                                      {WEIGHT_LABELS[o.weight || 0]}
                                    </span>
                                  </span>
                                )}
                                {(o.urgency || 0) > 0 && (
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className="block rounded-full"
                                      style={{
                                        width: 8,
                                        height: 8,
                                        background: URGENCY_COLORS[(o.urgency || 1) - 1],
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontFamily: 'var(--font-serif)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: URGENCY_COLORS[(o.urgency || 1) - 1],
                                      }}
                                    >
                                      {URGENCY_LABELS[o.urgency || 0]}
                                    </span>
                                  </span>
                                )}
                              </button>
                            );
                          }
                          return (
                            <div className="ml-[60px] space-y-2 pt-2 pb-1">
                              {hasValues && (
                                <button
                                  type="button"
                                  onClick={() => setSlidersOpenId(null)}
                                  className="cursor-pointer text-[10px]"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#8A6A4A',
                                    opacity: 0.5,
                                  }}
                                >
                                  collapse
                                </button>
                              )}
                              {(
                                [
                                  {
                                    label: 'how easy to solve?',
                                    field: 'ease',
                                    labels: EASE_LABELS,
                                    colors: EASE_COLORS,
                                    value: o.ease,
                                  },
                                  {
                                    label: 'how heavy does it feel?',
                                    field: 'weight',
                                    labels: WEIGHT_LABELS,
                                    colors: WEIGHT_COLORS,
                                    value: o.weight,
                                  },
                                  {
                                    label: 'how urgent?',
                                    field: 'urgency',
                                    labels: URGENCY_LABELS,
                                    colors: URGENCY_COLORS,
                                    value: o.urgency,
                                  },
                                ] as const
                              ).map(({ label, field, labels, colors, value }) => (
                                <div key={field}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span
                                      style={{
                                        fontFamily: 'var(--font-serif)',
                                        fontSize: '12px',
                                        color: '#7A5438',
                                        opacity: 0.7,
                                      }}
                                    >
                                      {label}
                                    </span>
                                    {(value || 0) > 0 && (
                                      <span
                                        style={{
                                          fontFamily: 'var(--font-serif)',
                                          fontSize: '12px',
                                          color: colors[(value || 1) - 1],
                                          fontWeight: 600,
                                        }}
                                      >
                                        {labels[value || 0]}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex gap-[3px]">
                                    {colors.map((color, i) => {
                                      const n = i + 1;
                                      return (
                                        <button
                                          key={n}
                                          type="button"
                                          onClick={() =>
                                            updateTodayField(o.id, field, value === n ? 0 : n)
                                          }
                                          className="flex-1 transition-all duration-150"
                                          style={{
                                            height: 14,
                                            borderRadius: 7,
                                            background: color,
                                            opacity: (value || 0) >= n ? 0.9 : 0.15,
                                            border: 'none',
                                            cursor: 'pointer',
                                          }}
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: '#C4A06020' }} />
            <span
              className="block h-5 w-5 rotate-45 rounded-[3px]"
              style={{ background: '#C4A060', opacity: 0.85 }}
            />
            <div className="h-px flex-1" style={{ background: '#C4A06020' }} />
          </div>

          {/* Push for tomorrow — drag-and-drop drop zone */}
          <div
            className="space-y-1.5 transition-all"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.from === 'daily' && data.text) moveToPush(data.text, data.id);
              } catch {}
            }}
          >
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setPushTomorrowOpen((s) => !s)}
                className="flex cursor-pointer items-center gap-2 rounded-full px-5 py-1.5 transition-all"
                style={{ background: '#C4A06015', border: '1px solid #C4A06040' }}
              >
                <span
                  className="text-center uppercase"
                  style={{
                    color: 'var(--light-surface-text, #5C3018)',
                    fontSize: '17px',
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                  }}
                >
                  {renamingSection === 'push' ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename('push', 'Push for tomorrow')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename('push', 'Push for tomorrow');
                        if (e.key === 'Escape') setRenamingSection(null);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      spellCheck={false}
                      autoCorrect="off"
                      className="bg-transparent text-center uppercase outline-none border-b"
                      style={{
                        color: 'var(--light-surface-text, #5C3018)',
                        fontSize: '17px',
                        fontWeight: 700,
                        letterSpacing: '0.22em',
                        borderColor: '#C4A06040',
                      }}
                    />
                  ) : (
                    <span
                      className="cursor-pointer"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenamingSection('push');
                        setRenameValue(sectionLabel('push', 'Push for tomorrow'));
                      }}
                      title="Double-click to rename"
                    >
                      {sectionLabel('push', 'Push for tomorrow')}
                    </span>
                  )}
                </span>
                <span
                  className="text-sm transition-transform duration-200"
                  style={{
                    color: 'var(--light-surface-muted, #7A5438)',
                    transform: pushTomorrowOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  ▾
                </span>
              </button>
            </div>
            {pushTomorrowOpen && (
              <>
                {todos
                  .filter((t) => !t.done)
                  .map((t) => {
                    const isDragging = draggedTodoId === t.id;
                    const isDropTarget = dragOverTodoId === t.id && draggedTodoId !== t.id;
                    return (
                      <div key={t.id}>
                        <div
                          className="group flex items-start gap-2"
                          draggable
                          onDragStart={(e) => {
                            setDraggedTodoId(t.id);
                            e.dataTransfer.setData(
                              'text/plain',
                              JSON.stringify({ from: 'push', id: t.id, text: t.text }),
                            );
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (draggedTodoId !== null && draggedTodoId !== t.id)
                              setDragOverTodoId(t.id);
                          }}
                          onDragLeave={(e) => {
                            if (
                              !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)
                            ) {
                              setDragOverTodoId((prev) => (prev === t.id ? null : prev));
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedTodoId !== null) reorderTodos(draggedTodoId, t.id);
                            setDraggedTodoId(null);
                            setDragOverTodoId(null);
                          }}
                          onDragEnd={() => {
                            setDraggedTodoId(null);
                            setDragOverTodoId(null);
                          }}
                          style={{
                            opacity: isDragging ? 0.4 : 1,
                            borderTop: isDropTarget ? '2px solid #C4A060' : '2px solid transparent',
                            cursor: 'grab',
                            transition: 'opacity 120ms, border-color 120ms',
                          }}
                        >
                          {/* Done — pill, ochre */}
                          <button
                            type="button"
                            onClick={() => toggleTodo(t.id)}
                            title={t.done ? 'Mark as not done' : 'Mark as done'}
                            className="shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition-all hover:opacity-80"
                            style={{
                              background: t.done ? '#C4A060' : '#C4A06015',
                              border: '1px solid #C4A06050',
                              color: t.done ? '#fff' : LIGHT_PILL_TEXT,
                              minWidth: 52,
                            }}
                          >
                            done
                          </button>
                          {!t.done && t.status && t.status !== 'active' && (
                            <span
                              className="block shrink-0 rounded-full"
                              style={{
                                width: 7,
                                height: 7,
                                background: STATUS_CONFIG[t.status].color,
                              }}
                              title={STATUS_CONFIG[t.status].label}
                            />
                          )}
                          {renamingTodoId === t.id ? (
                            <input
                              type="text"
                              value={renameTodoValue}
                              onChange={(e) => setRenameTodoValue(e.target.value)}
                              onBlur={() => {
                                const trimmed = renameTodoValue.trim();
                                if (trimmed && trimmed !== t.text)
                                  updateTodoField(t.id, 'text', trimmed);
                                setRenamingTodoId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const trimmed = renameTodoValue.trim();
                                  if (trimmed && trimmed !== t.text)
                                    updateTodoField(t.id, 'text', trimmed);
                                  setRenamingTodoId(null);
                                }
                                if (e.key === 'Escape') setRenamingTodoId(null);
                              }}
                              autoFocus
                              spellCheck={false}
                              autoCorrect="off"
                              className="flex-1 bg-transparent text-center outline-none border-b"
                              style={{
                                color: '#7a5438',
                                fontFamily: 'var(--font-handwritten)',
                                fontSize: '20px',
                                borderColor: '#C4A06040',
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTodoId(expandedTodoId === t.id ? null : t.id)
                              }
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setRenamingTodoId(t.id);
                                setRenameTodoValue(t.text);
                              }}
                              className="min-w-0 flex-1 cursor-pointer bg-transparent text-center"
                              style={{
                                color: t.done
                                  ? LIGHT_PILL_MUTED
                                  : t.status === 'waiting'
                                    ? '#A08060'
                                    : '#7a5438',
                                fontFamily: 'var(--font-handwritten)',
                                fontSize: '20px',
                                opacity: t.done ? 0.5 : t.status === 'waiting' ? 0.5 : 1,
                                border: 'none',
                                fontStyle: t.status === 'waiting' ? 'italic' : 'normal',
                                lineHeight: 1.18,
                                overflowWrap: 'anywhere',
                                whiteSpace: 'normal',
                              }}
                              title="Click to expand · Double-click to rename"
                            >
                              {t.text}
                              {t.status === 'waiting' && (
                                <span
                                  className="ml-2 text-xs"
                                  style={{ color: '#A08060', fontStyle: 'italic' }}
                                >
                                  waiting
                                </span>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeTodo(t.id)}
                            title="Remove"
                            className="cursor-pointer text-sm opacity-0 transition-opacity group-hover:opacity-40"
                            style={{ color: '#7a5438', background: 'none', border: 'none' }}
                          >
                            ✕
                          </button>
                        </div>
                        {expandedTodoId === t.id && (
                          <div className="space-y-2 pl-[60px] pt-1 animate-in fade-in duration-150">
                            <button
                              type="button"
                              onClick={() =>
                                updateTodoField(
                                  t.id,
                                  'status',
                                  t.status === 'waiting' ? 'active' : 'waiting',
                                )
                              }
                              className="flex cursor-pointer items-center gap-2 transition-all"
                              style={{ background: 'none', border: 'none' }}
                            >
                              <span
                                className="block rounded-full"
                                style={{
                                  width: 10,
                                  height: 10,
                                  background: t.status === 'waiting' ? '#A08060' : '#7AAA58',
                                }}
                              />
                              <span
                                style={{
                                  fontFamily: 'var(--font-serif)',
                                  fontSize: '12px',
                                  color: t.status === 'waiting' ? '#A08060' : '#7AAA58',
                                  fontWeight: 600,
                                }}
                              >
                                {t.status === 'waiting' ? 'Waiting for reply' : 'Active'}
                              </span>
                            </button>
                            <CategoryTagPicker
                              value={t.tag || null}
                              onChange={(tag) => updateTodoTag(t.id, tag)}
                              open={objTagPickerId === `todo-${t.id}`}
                              onToggle={() =>
                                setObjTagPickerId(
                                  objTagPickerId === `todo-${t.id}` ? null : `todo-${t.id}`,
                                )
                              }
                              onClose={() => setObjTagPickerId(null)}
                              lifeCategories={lifeCategories}
                              compassAxes={COMPASS_AXES}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                <div className="flex items-end gap-2">
                  <input
                    type="text"
                    value={todoInput}
                    onChange={(e) => setTodoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addTodo();
                    }}
                    placeholder="add a to-do..."
                    spellCheck={false}
                    autoCorrect="off"
                    className="flex-1 border-b bg-transparent pb-1 outline-none text-center placeholder:text-center placeholder:text-[#7A5438] placeholder:opacity-50"
                    style={{
                      color: '#7a5438',
                      borderColor: '#C4A06020',
                      fontFamily: 'var(--font-handwritten)',
                      fontSize: '24px',
                      fontWeight: 700,
                    }}
                  />
                  <MicDot
                    visible={todoInput.length > 0}
                    value={todoInput}
                    onTranscript={setTodoInput}
                  />
                </div>
              </>
            )}
          </div>

          {/* Done section */}
          {(doneObjectives.length > 0 ||
            todayObjectives.some((o) => o.done) ||
            todos.some((t) => t.done)) && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setDoneOpen((s) => !s)}
                className="flex cursor-pointer items-center gap-1.5 px-1"
                style={{ background: 'none', border: 'none' }}
              >
                <span
                  className="font-semibold uppercase tracking-[0.22em]"
                  style={{ color: '#7AAA58', fontSize: '13px' }}
                >
                  Done
                </span>
                <span
                  className="text-[10px] transition-transform duration-200"
                  style={{
                    color: '#7AAA5880',
                    transform: doneOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  ▾
                </span>
              </button>
              {doneOpen && (
                <div className="space-y-1 animate-in fade-in duration-150">
                  {(() => {
                    const _today = new Date().toISOString().split('T')[0];
                    const all: { id: string; text: string; onUndo?: () => void }[] = [];
                    for (const o of todayObjectives.filter((o) => o.done)) {
                      all.push({
                        id: `today-${o.id}`,
                        text: o.text,
                        onUndo: () => toggleTodayObjective(o.id),
                      });
                    }
                    for (const t of todos.filter((t) => t.done)) {
                      all.push({
                        id: `push-${t.id}`,
                        text: t.text,
                        onUndo: () => toggleTodo(t.id),
                      });
                    }
                    for (const d of doneObjectives.slice(0, 20)) {
                      if (!all.some((a) => a.text === d.text)) {
                        all.push({ id: d.id, text: d.text });
                      }
                    }
                    return all.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                        style={{ background: '#7AAA5808' }}
                      >
                        <button
                          type="button"
                          onClick={item.onUndo}
                          disabled={!item.onUndo}
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all"
                          style={{
                            borderColor: '#7AAA5860',
                            background: '#7AAA5810',
                            cursor: item.onUndo ? 'pointer' : 'default',
                          }}
                        >
                          <span className="text-[10px]" style={{ color: '#7AAA58' }}>
                            ✓
                          </span>
                        </button>
                        <span
                          style={{
                            color: '#8A6A4A',
                            fontFamily: 'var(--font-handwritten)',
                            fontSize: '16px',
                            opacity: 0.6,
                          }}
                        >
                          {item.text}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
