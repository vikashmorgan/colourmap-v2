'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================
// AI GENERATION (preserved from music toolkit)
// ============================================================

const GENERATE_TYPES = [
  { id: 'chorus', label: 'Chorus', color: '#9B6BA0' },
  { id: 'verse', label: 'Verse', color: '#7A8A50' },
  { id: 'chords', label: 'Chords', color: '#C88820' },
  { id: 'bridge', label: 'Bridge', color: '#3A8AC4' },
] as const;

function GenerateButtons({ context }: { context: string }) {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState<string | null>(null);

  async function generate(type: string) {
    setLoading(true);
    setActiveType(type);
    setResult('');
    try {
      const res = await fetch('/api/notebook/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context }),
      });
      if (!res.ok || !res.body) {
        setResult('Failed.');
        setLoading(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setResult(text);
      }
    } catch {
      setResult('Failed.');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mr-1">
          AI Ideas
        </span>
        {GENERATE_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={loading}
            onClick={() => generate(t.id)}
            className="px-2 py-0.5 rounded-lg text-[9px] font-medium transition-all disabled:opacity-40"
            style={{
              background: activeType === t.id ? `${t.color}20` : 'transparent',
              border: `1px solid ${activeType === t.id ? t.color : `${t.color}30`}`,
              color: t.color,
            }}
          >
            {loading && activeType === t.id ? '...' : t.label}
          </button>
        ))}
      </div>
      {result && (
        <pre
          className="whitespace-pre-wrap text-xs leading-relaxed rounded-xl border border-border/50 bg-background/40 p-3 animate-in fade-in duration-150"
          style={{ color: '#5A4535' }}
        >
          {result}
        </pre>
      )}
    </div>
  );
}

// ============================================================
// TYPES & CONSTANTS
// ============================================================

interface Entry {
  id: string;
  category: string;
  title: string;
  content: string | null;
  tags: string[] | null;
  createdAt: string;
}

interface Notebook {
  id: string;
  label: string;
  color: string;
  icon: string;
  isMusic?: boolean;
}

const NOTE_COLORS = [
  { id: 'none', color: 'transparent', label: 'None' },
  { id: 'warm', color: '#C4A06010', label: 'Warm' },
  { id: 'rose', color: '#D4605A0C', label: 'Rose' },
  { id: 'sky', color: '#3A8AC40C', label: 'Sky' },
  { id: 'sage', color: '#7A8A500C', label: 'Sage' },
  { id: 'lavender', color: '#9B6BA00C', label: 'Lavender' },
  { id: 'amber', color: '#C888200C', label: 'Amber' },
];

const NOTE_FONTS = [
  { id: 'default', label: 'Default', family: 'inherit' },
  { id: 'serif', label: 'Serif', family: 'var(--font-serif)' },
  { id: 'mono', label: 'Mono', family: 'var(--font-cowboy)' },
  { id: 'hand', label: 'Handwritten', family: 'var(--font-handwritten)' },
  { id: 'sketch', label: 'Sketch', family: 'var(--font-sketch)' },
];

const DEFAULT_NOTEBOOKS: Notebook[] = [
  { id: 'notes', label: 'Notes', color: '#C4A060', icon: '📝' },
  { id: 'ideas', label: 'Ideas', color: '#E0844A', icon: '💡' },
  { id: 'journal', label: 'Journal', color: '#7A8A50', icon: '📖' },
  { id: 'tasks', label: 'Tasks', color: '#3A8AC4', icon: '✓' },
  { id: 'song_ideas', label: 'Songs', color: '#9B6BA0', icon: '♪', isMusic: true },
  { id: 'projects', label: 'Projects', color: '#3A8AC4', icon: '🎵', isMusic: true },
  { id: 'rhymes', label: 'Rhymes', color: '#D4605A', icon: '✎', isMusic: true },
  { id: 'practice_log', label: 'Practice', color: '#7A8A50', icon: '🎸', isMusic: true },
  { id: 'errors', label: 'Lessons', color: '#D45050', icon: '⚡', isMusic: true },
];

const NOTEBOOK_STORAGE = 'colourmap:notebooks-v2';
const COLOR_PICKER = [
  '#C4A060',
  '#E0844A',
  '#D4605A',
  '#D45050',
  '#3A8AC4',
  '#9B6BA0',
  '#7A8A50',
  '#C88820',
  '#3AA8A0',
  '#5A7A8A',
];

// ============================================================
// FORMATTING TOOLBAR
// ============================================================

function FormatToolbar({
  value,
  onChange,
  noteColor,
  onNoteColor,
  noteFont,
  onNoteFont,
  align,
  onAlign,
}: {
  value: string;
  onChange: (v: string) => void;
  noteColor: string;
  onNoteColor: (c: string) => void;
  noteFont: string;
  onNoteFont: (f: string) => void;
  align: string;
  onAlign: (a: string) => void;
}) {
  const [showColors, setShowColors] = useState(false);
  const [showFonts, setShowFonts] = useState(false);

  function wrapSelection(prefix: string, suffix: string) {
    const textarea = document.getElementById('note-editor') as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const newValue = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  }

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {/* Bold */}
      <button
        type="button"
        onClick={() => wrapSelection('**', '**')}
        className="h-7 w-7 flex items-center justify-center rounded text-xs font-bold text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        B
      </button>
      {/* Italic */}
      <button
        type="button"
        onClick={() => wrapSelection('*', '*')}
        className="h-7 w-7 flex items-center justify-center rounded text-xs italic text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        I
      </button>
      {/* Heading */}
      <button
        type="button"
        onClick={() => wrapSelection('\n## ', '\n')}
        className="h-7 w-7 flex items-center justify-center rounded text-[10px] font-bold text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        H
      </button>
      {/* List */}
      <button
        type="button"
        onClick={() => wrapSelection('\n- ', '')}
        className="h-7 w-7 flex items-center justify-center rounded text-xs text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        •
      </button>

      <div className="w-px h-4 bg-border/50 mx-1" />

      {/* Alignment */}
      {['left', 'center', 'right'].map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onAlign(a)}
          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
          style={{ opacity: align === a ? 1 : 0.4 }}
        >
          <div className="flex flex-col gap-[2px]">
            <div
              className="h-[1.5px] rounded-full bg-current"
              style={{ width: a === 'center' ? 8 : a === 'right' ? 6 : 10 }}
            />
            <div
              className="h-[1.5px] rounded-full bg-current"
              style={{ width: 10, marginLeft: a === 'center' ? 1 : a === 'right' ? 4 : 0 }}
            />
            <div
              className="h-[1.5px] rounded-full bg-current"
              style={{ width: a === 'center' ? 6 : a === 'right' ? 8 : 7 }}
            />
          </div>
        </button>
      ))}

      <div className="w-px h-4 bg-border/50 mx-1" />

      {/* Note color */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowColors(!showColors);
            setShowFonts(false);
          }}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent/50 transition-colors"
        >
          <div
            className="h-4 w-4 rounded-sm border border-border/50"
            style={{ background: noteColor || '#C4A06010' }}
          />
        </button>
        {showColors && (
          <div className="absolute top-full mt-1 left-0 z-50 flex gap-1 p-1.5 rounded-lg border border-border bg-card shadow-lg animate-in fade-in duration-100">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onNoteColor(c.color);
                  setShowColors(false);
                }}
                className="h-5 w-5 rounded-sm border border-border/30 transition-all hover:scale-110"
                style={{
                  background: c.color === 'transparent' ? '#ffffff' : c.color,
                  outline: noteColor === c.color ? '2px solid #C4A060' : 'none',
                  outlineOffset: 1,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Font selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowFonts(!showFonts);
            setShowColors(false);
          }}
          className="h-7 px-1.5 flex items-center justify-center rounded text-[10px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          Aa
        </button>
        {showFonts && (
          <div className="absolute top-full mt-1 right-0 z-50 p-1 rounded-lg border border-border bg-card shadow-lg animate-in fade-in duration-100 min-w-[120px]">
            {NOTE_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onNoteFont(f.family);
                  setShowFonts(false);
                }}
                className="w-full text-left px-2 py-1 rounded text-xs transition-colors hover:bg-accent/50"
                style={{ fontFamily: f.family, fontWeight: noteFont === f.family ? 600 : 400 }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// NOTE RENDERER (markdown-lite)
// ============================================================

function NotePreview({
  content,
  font,
  align,
  color,
}: {
  content: string;
  font: string;
  align: string;
  color: string;
}) {
  if (!content) return null;

  const lines = content.split('\n');
  return (
    <div
      className="text-sm leading-relaxed space-y-1 rounded-lg p-3"
      style={{
        fontFamily: font,
        textAlign: align as 'left' | 'center' | 'right',
        background: color,
        color: '#5A4535',
      }}
    >
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <p key={i} className="text-base font-semibold font-serif mt-2 mb-1">
              {line.slice(3)}
            </p>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <p key={i} className="pl-3">
              • {renderInline(line.slice(2))}
            </p>
          );
        }
        if (!line.trim()) return <div key={i} className="h-2" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/\*(.+?)\*/);

    if (
      boldMatch &&
      boldMatch.index !== undefined &&
      (!italicMatch || boldMatch.index <= (italicMatch.index ?? Infinity))
    ) {
      if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0) parts.push(remaining.slice(0, italicMatch.index));
      parts.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }
  return parts;
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function NotebookPage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>(DEFAULT_NOTEBOOKS);
  const [activeNotebook, setActiveNotebook] = useState<string>('notes');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAddNotebook, setShowAddNotebook] = useState(false);
  const [newNbName, setNewNbName] = useState('');
  const [newNbColor, setNewNbColor] = useState('#C4A060');
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Per-note styling (stored in localStorage)
  const [noteStyles, setNoteStyles] = useState<
    Record<string, { color: string; font: string; align: string }>
  >({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTEBOOK_STORAGE);
      if (saved) setNotebooks(JSON.parse(saved));
      const styles = localStorage.getItem('colourmap:note-styles');
      if (styles) setNoteStyles(JSON.parse(styles));
    } catch {
      /* */
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    const res = await fetch('/api/notebook');
    if (res.ok) setEntries(await res.json());
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function saveNotebooks(nbs: Notebook[]) {
    setNotebooks(nbs);
    localStorage.setItem(NOTEBOOK_STORAGE, JSON.stringify(nbs));
  }

  function saveNoteStyle(id: string, style: { color: string; font: string; align: string }) {
    const updated = { ...noteStyles, [id]: style };
    setNoteStyles(updated);
    localStorage.setItem('colourmap:note-styles', JSON.stringify(updated));
  }

  function getNoteStyle(id: string) {
    return noteStyles[id] || { color: 'transparent', font: 'inherit', align: 'left' };
  }

  async function handleAdd() {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch('/api/notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: activeNotebook, title: newTitle.trim() }),
      });
      if (res.ok) {
        const entry = await res.json();
        setEntries((prev) => [entry, ...prev]);
        setNewTitle('');
        setExpandedId(entry.id);
        setEditingId(entry.id);
      }
    } finally {
      setAdding(false);
    }
  }

  function autoSave(id: string, field: string, value: string) {
    const key = `${id}-${field}`;
    const existing = saveTimers.current.get(key);
    if (existing) clearTimeout(existing);
    saveTimers.current.set(
      key,
      setTimeout(() => {
        fetch(`/api/notebook/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value || null }),
        });
      }, 800),
    );
  }

  function updateLocal(id: string, field: string, value: string) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
    autoSave(id, field, value);
  }

  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (expandedId === id) {
      setExpandedId(null);
      setEditingId(null);
    }
    await fetch(`/api/notebook/${id}`, { method: 'DELETE' });
  }

  const activeNb = notebooks.find((n) => n.id === activeNotebook);
  const filtered = entries.filter((e) => e.category === activeNotebook);
  const projectEntries = entries.filter((e) => e.category === 'projects');

  const placeholder = activeNb?.isMusic
    ? activeNotebook === 'song_ideas'
      ? 'New song idea...'
      : activeNotebook === 'rhymes'
        ? 'Enter a word...'
        : activeNotebook === 'practice_log'
          ? 'What did you practice?'
          : 'New entry...'
    : 'New note...';

  return (
    <main className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p
          className="text-[15px] font-normal tracking-[0.08em] font-serif"
          style={{ color: '#5C3018' }}
        >
          Notebook
        </p>
      </div>

      <div className="flex gap-6">
        {/* ========== LEFT: NOTEBOOK TABS (vertical) ========== */}
        <div className="w-[140px] shrink-0 space-y-1">
          {notebooks.map((nb) => {
            const isActive = activeNotebook === nb.id;
            const count = entries.filter((e) => e.category === nb.id).length;
            return (
              <button
                key={nb.id}
                type="button"
                onClick={() => setActiveNotebook(nb.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
                style={{
                  background: isActive ? `${nb.color}15` : 'transparent',
                  borderLeft: isActive ? `3px solid ${nb.color}` : '3px solid transparent',
                }}
              >
                <span className="text-sm">{nb.icon}</span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[11px] font-medium truncate"
                    style={{ color: isActive ? nb.color : `${nb.color}80` }}
                  >
                    {nb.label}
                  </p>
                  {count > 0 && (
                    <p className="text-[9px]" style={{ color: `${nb.color}40` }}>
                      {count} notes
                    </p>
                  )}
                </div>
              </button>
            );
          })}

          {/* Add notebook */}
          <button
            type="button"
            onClick={() => setShowAddNotebook(!showAddNotebook)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all hover:bg-accent/30"
          >
            <span className="text-sm opacity-30">+</span>
            <span className="text-[10px] text-muted-foreground/30">New notebook</span>
          </button>

          {showAddNotebook && (
            <div className="p-2 rounded-xl border border-border/50 space-y-2 animate-in fade-in duration-150">
              <input
                type="text"
                value={newNbName}
                onChange={(e) => setNewNbName(e.target.value)}
                placeholder="Name..."
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-[11px] outline-none"
              />
              <div className="flex flex-wrap gap-1">
                {COLOR_PICKER.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewNbColor(c)}
                    className="h-3.5 w-3.5 rounded-full transition-all hover:scale-125"
                    style={{ background: c, opacity: newNbColor === c ? 1 : 0.3 }}
                  />
                ))}
              </div>
              <button
                type="button"
                disabled={!newNbName.trim()}
                onClick={() => {
                  const id = newNbName.trim().toLowerCase().replace(/\s+/g, '_');
                  saveNotebooks([
                    ...notebooks,
                    { id, label: newNbName.trim(), color: newNbColor, icon: '📄' },
                  ]);
                  setActiveNotebook(id);
                  setNewNbName('');
                  setShowAddNotebook(false);
                }}
                className="w-full text-[10px] py-1 rounded-lg font-medium disabled:opacity-30"
                style={{ color: newNbColor, background: `${newNbColor}10` }}
              >
                Create
              </button>
            </div>
          )}
        </div>

        {/* ========== RIGHT: NOTES ========== */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Notebook header */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">{activeNb?.icon}</span>
            <h2 className="text-lg font-serif" style={{ color: activeNb?.color }}>
              {activeNb?.label}
            </h2>
            <div className="flex-1" />
            <span className="text-[10px] text-muted-foreground/30">{filtered.length} notes</span>
          </div>

          {/* Add note */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/30"
              style={{
                borderColor: `${activeNb?.color || '#C4A060'}15`,
                background: `${activeNb?.color || '#C4A060'}03`,
              }}
            />
            {newTitle.trim() && (
              <button
                type="submit"
                disabled={adding}
                className="text-xs font-medium px-3 py-2 rounded-lg"
                style={{ color: activeNb?.color, background: `${activeNb?.color}10` }}
              >
                {adding ? '...' : 'Add'}
              </button>
            )}
          </form>

          {/* Notes list */}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <span className="text-3xl opacity-10">{activeNb?.icon}</span>
              <p className="text-sm text-muted-foreground/30 mt-2">No notes yet</p>
            </div>
          )}

          {filtered.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const isEditing = editingId === entry.id;
            const color = activeNb?.color || '#C4A060';
            const style = getNoteStyle(entry.id);
            const isSong = entry.category === 'song_ideas';
            const isProject = entry.category === 'projects';
            const projectSongs = isProject
              ? entries.filter((e) => e.category === 'song_ideas' && e.tags?.includes(entry.id))
              : [];

            return (
              <div
                key={entry.id}
                className="rounded-2xl border transition-all overflow-hidden"
                style={{
                  borderColor: isExpanded ? `${color}30` : `${color}0A`,
                  background: isExpanded ? style.color || `${color}04` : 'transparent',
                }}
              >
                {/* ---- COLLAPSED ---- */}
                {!isExpanded && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(entry.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left group"
                  >
                    <div
                      className="w-1.5 h-8 rounded-full shrink-0"
                      style={{ background: color, opacity: 0.2 }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.title}</p>
                      {entry.content && (
                        <p className="text-[11px] text-muted-foreground/30 truncate mt-0.5">
                          {entry.content
                            .replace(/\*\*/g, '')
                            .replace(/\|\|\|CHORDS\|\|\|.*/, '')
                            .slice(0, 60)}
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground/20 shrink-0">
                      {new Date(entry.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </button>
                )}

                {/* ---- EXPANDED ---- */}
                {isExpanded && (
                  <div className="animate-in fade-in duration-200">
                    {/* Title bar */}
                    <div className="px-4 pt-3 pb-1 flex items-center gap-3">
                      <div
                        className="w-1.5 h-6 rounded-full shrink-0"
                        style={{ background: color, opacity: 0.3 }}
                      />
                      <input
                        type="text"
                        value={entry.title}
                        onChange={(e) => updateLocal(entry.id, 'title', e.target.value)}
                        className="flex-1 text-sm font-semibold bg-transparent outline-none font-serif"
                        style={{ color, textAlign: style.align as 'left' | 'center' | 'right' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedId(null);
                          setEditingId(null);
                        }}
                        className="text-xs text-muted-foreground/30 hover:text-muted-foreground"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Format toolbar */}
                    <div className="px-4 py-1 border-b border-border/20">
                      <FormatToolbar
                        value={
                          isSong
                            ? (entry.content || '').split('|||CHORDS|||')[0]
                            : entry.content || ''
                        }
                        onChange={(v) => {
                          if (isSong) {
                            const chords = (entry.content || '').split('|||CHORDS|||')[1] || '';
                            updateLocal(
                              entry.id,
                              'content',
                              chords.trim() ? `${v}|||CHORDS|||${chords}` : v,
                            );
                          } else {
                            updateLocal(entry.id, 'content', v);
                          }
                        }}
                        noteColor={style.color}
                        onNoteColor={(c) => saveNoteStyle(entry.id, { ...style, color: c })}
                        noteFont={style.font}
                        onNoteFont={(f) => saveNoteStyle(entry.id, { ...style, font: f })}
                        align={style.align}
                        onAlign={(a) => saveNoteStyle(entry.id, { ...style, align: a })}
                      />
                    </div>

                    {/* Content area */}
                    <div className="px-4 pb-4 pt-2 space-y-3">
                      {/* Song: lyrics + chords + AI */}
                      {isSong ? (
                        (() => {
                          const parts = (entry.content || '').split('|||CHORDS|||');
                          const lyrics = parts[0] || '';
                          const chords = parts[1] || '';
                          function updateSong(l: string, c: string) {
                            updateLocal(entry.id, 'content', c.trim() ? `${l}|||CHORDS|||${c}` : l);
                          }
                          return (
                            <div className="space-y-3">
                              {isEditing ? (
                                <>
                                  <textarea
                                    id="note-editor"
                                    value={lyrics}
                                    onChange={(e) => updateSong(e.target.value, chords)}
                                    placeholder="Write lyrics or melody ideas..."
                                    className="w-full min-h-[100px] rounded-lg border border-border/20 bg-transparent p-3 text-sm resize-none outline-none"
                                    style={{
                                      color: '#5A4535',
                                      fontFamily: style.font,
                                      textAlign: style.align as 'left' | 'center' | 'right',
                                    }}
                                    onInput={(e) => {
                                      const t = e.target as HTMLTextAreaElement;
                                      t.style.height = 'auto';
                                      t.style.height = t.scrollHeight + 'px';
                                    }}
                                  />
                                  <textarea
                                    value={chords}
                                    onChange={(e) => updateSong(lyrics, e.target.value)}
                                    placeholder="Am - F - C - G..."
                                    className="w-full min-h-[40px] rounded-lg border border-[#C88820]/10 bg-[#C88820]/3 p-3 text-sm resize-none outline-none font-mono"
                                    style={{ color: '#8A7A5A' }}
                                    onInput={(e) => {
                                      const t = e.target as HTMLTextAreaElement;
                                      t.style.height = 'auto';
                                      t.style.height = t.scrollHeight + 'px';
                                    }}
                                  />
                                </>
                              ) : (
                                <div onClick={() => setEditingId(entry.id)} className="cursor-text">
                                  <NotePreview
                                    content={lyrics}
                                    font={style.font}
                                    align={style.align}
                                    color="transparent"
                                  />
                                  {chords && (
                                    <div
                                      className="mt-2 rounded-lg p-2 font-mono text-xs"
                                      style={{ background: '#C88820/5', color: '#8A7A5A' }}
                                    >
                                      {chords}
                                    </div>
                                  )}
                                </div>
                              )}
                              <GenerateButtons
                                context={[entry.title, lyrics, chords].filter(Boolean).join('\n')}
                              />
                            </div>
                          );
                        })()
                      ) : isEditing ? (
                        <textarea
                          id="note-editor"
                          value={entry.content || ''}
                          onChange={(e) => updateLocal(entry.id, 'content', e.target.value)}
                          placeholder="Start writing..."
                          className="w-full min-h-[120px] rounded-lg border border-border/20 bg-transparent p-3 text-sm resize-none outline-none"
                          style={{
                            color: '#5A4535',
                            fontFamily: style.font,
                            textAlign: style.align as 'left' | 'center' | 'right',
                          }}
                          onInput={(e) => {
                            const t = e.target as HTMLTextAreaElement;
                            t.style.height = 'auto';
                            t.style.height = t.scrollHeight + 'px';
                          }}
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => setEditingId(entry.id)}
                          className="cursor-text min-h-[60px]"
                        >
                          {entry.content ? (
                            <NotePreview
                              content={entry.content}
                              font={style.font}
                              align={style.align}
                              color="transparent"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground/20 py-2">
                              Click to write...
                            </p>
                          )}
                        </div>
                      )}

                      {/* Project links for songs */}
                      {isSong && projectEntries.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {projectEntries.map((p) => {
                            const linked = entry.tags?.includes(p.id);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  const tags = entry.tags || [];
                                  const next = linked
                                    ? tags.filter((t) => t !== p.id)
                                    : [...tags, p.id];
                                  setEntries((prev) =>
                                    prev.map((e) => (e.id === entry.id ? { ...e, tags: next } : e)),
                                  );
                                  fetch(`/api/notebook/${entry.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ tags: next }),
                                  });
                                }}
                                className="px-2 py-0.5 rounded-lg text-[9px] font-medium"
                                style={{
                                  background: linked ? '#3A8AC420' : 'transparent',
                                  border: `1px solid ${linked ? '#3A8AC4' : '#3A8AC430'}`,
                                  color: '#3A8AC4',
                                }}
                              >
                                {p.title}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Songs in project */}
                      {isProject && projectSongs.length > 0 && (
                        <div className="space-y-1">
                          {projectSongs.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setActiveNotebook('song_ideas');
                                setExpandedId(s.id);
                              }}
                              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <span className="opacity-40">♪</span> {s.title}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/10">
                        <span className="text-[9px] text-muted-foreground/20">
                          {new Date(entry.createdAt).toLocaleDateString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground"
                            >
                              Done
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingId(entry.id)}
                              className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            className="text-[10px] text-muted-foreground/20 hover:text-destructive"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
