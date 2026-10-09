'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ArtIdeas from '@/components/ArtIdeas';
import MicDot from '@/components/MicDot';
import MusicRecordings from '@/components/MusicRecordings';

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
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mr-1">
          AI Ideas
        </span>
        {GENERATE_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={loading}
            onClick={() => generate(t.id)}
            className="px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40"
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
  { id: 'notes', label: 'Notes', color: '#C4A060' },
  { id: 'ideas', label: 'Ideas', color: '#E0844A' },
  { id: 'journal', label: 'Journal', color: '#7A8A50' },
  { id: 'song_ideas', label: 'Songs', color: '#9B6BA0', isMusic: true },
  { id: 'projects', label: 'Projects', color: '#3A8AC4', isMusic: true },
  { id: 'rhymes', label: 'Rhymes', color: '#D4605A', isMusic: true },
  { id: 'practice_log', label: 'Practice', color: '#7A8A50', isMusic: true },
  { id: 'errors', label: 'Lessons', color: '#D45050', isMusic: true },
  { id: 'recordings', label: 'Recordings', color: '#E04878', isMusic: true },
];

const NOTEBOOK_STORAGE = 'colourmap:notebooks-v2';
const TRASH_STORAGE = 'colourmap:notebook-trash';
const DELETED_NB_ID = '__deleted__';
// A notebook's name from its id, the reverse of how a new notebook gets its id
// ("Cammino del cuore" -> "cammino_del_cuore").
const notebookLabel = (id: string) => {
  const words = id.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};
const TRASH_TTL_DAYS = 14;
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
  noteColor,
  onNoteColor,
  noteFont,
  onNoteFont,
  noteSize,
  onNoteSize,
  align,
  onAlign,
}: {
  noteColor: string;
  onNoteColor: (c: string) => void;
  noteFont: string;
  onNoteFont: (f: string) => void;
  noteSize: string;
  onNoteSize: (s: string) => void;
  align: string;
  onAlign: (a: string) => void;
}) {
  const [showColors, setShowColors] = useState(false);
  const [showFonts, setShowFonts] = useState(false);
  const [showSizes, setShowSizes] = useState(false);

  function exec(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    // Re-focus the editor
    document.getElementById('note-editor')?.focus();
  }

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {/* Bold */}
      <button
        type="button"
        onClick={() => exec('bold')}
        className="h-7 w-7 flex items-center justify-center rounded text-xs font-bold text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        B
      </button>
      {/* Italic */}
      <button
        type="button"
        onClick={() => exec('italic')}
        className="h-7 w-7 flex items-center justify-center rounded text-xs italic text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        I
      </button>
      {/* Underline */}
      <button
        type="button"
        onClick={() => exec('underline')}
        className="h-7 w-7 flex items-center justify-center rounded text-xs underline text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        U
      </button>
      {/* Heading */}
      <button
        type="button"
        onClick={() => exec('formatBlock', 'h2')}
        className="h-7 w-7 flex items-center justify-center rounded text-xs font-bold text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        H
      </button>
      {/* List */}
      <button
        type="button"
        onClick={() => exec('insertUnorderedList')}
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
          className="h-7 px-1.5 flex items-center justify-center rounded text-xs text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
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

      {/* Font size */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowSizes(!showSizes);
            setShowColors(false);
            setShowFonts(false);
          }}
          className="h-7 px-1.5 flex items-center justify-center rounded text-xs text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          {noteSize || '16'}
        </button>
        {showSizes && (
          <div className="absolute top-full mt-1 right-0 z-50 p-1 rounded-lg border border-border bg-card shadow-lg animate-in fade-in duration-100 min-w-[60px]">
            {['14', '16', '18', '20', '24'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onNoteSize(s);
                  setShowSizes(false);
                }}
                className="w-full text-left px-2 py-1 rounded text-xs transition-colors hover:bg-accent/50"
                style={{ fontWeight: noteSize === s ? 600 : 400 }}
              >
                {s}px
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
  size,
}: {
  content: string;
  font: string;
  align: string;
  color: string;
  size?: string;
}) {
  if (!content) return null;

  const lines = content.split('\n');
  return (
    <div
      className="leading-relaxed space-y-1 rounded-lg p-3"
      style={{
        fontFamily: font,
        fontSize: `${size || 16}px`,
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
  const [fullViewId, setFullViewId] = useState<string | null>(null);
  const [spellCheckOn, setSpellCheckOn] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [showNbMenu, setShowNbMenu] = useState(false);
  const [showAddNotebook, setShowAddNotebook] = useState(false);
  const [newNbName, setNewNbName] = useState('');
  const [newNbColor, setNewNbColor] = useState('#C4A060');
  const [showMusic, setShowMusic] = useState(false);
  const [trashEntries, setTrashEntries] = useState<(Entry & { deletedAt: string })[]>([]);
  const [renamingNbId, setRenamingNbId] = useState<string | null>(null);
  const [renameNbValue, setRenameNbValue] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Escape exits full view
  useEffect(() => {
    if (!fullViewId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFullViewId(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullViewId]);

  // Per-note styling (stored in localStorage)
  const [noteStyles, setNoteStyles] = useState<
    Record<string, { color: string; font: string; align: string; size?: string }>
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
    // Load trash and auto-purge entries older than TRASH_TTL_DAYS
    try {
      const raw = localStorage.getItem(TRASH_STORAGE);
      if (raw) {
        const all: (Entry & { deletedAt: string })[] = JSON.parse(raw);
        const cutoff = Date.now() - TRASH_TTL_DAYS * 86400_000;
        const fresh = all.filter((e) => new Date(e.deletedAt).getTime() > cutoff);
        setTrashEntries(fresh);
        localStorage.setItem(TRASH_STORAGE, JSON.stringify(fresh));
      }
    } catch {
      /* */
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/notebook');
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
        localStorage.setItem('colourmap:notebook-entries', JSON.stringify(data));
        return;
      }
    } catch {}
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem('colourmap:notebook-entries');
      if (raw) setEntries(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Persist entries to localStorage on every change
  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem('colourmap:notebook-entries', JSON.stringify(entries));
    }
  }, [entries]);

  // The list of notebooks is kept per device, but their notes live in the
  // account. A notebook that has notes and is missing here (made on another
  // device, or filled from the terminal) is added, named from its id, so no
  // note ever sits in a notebook this device cannot open.
  useEffect(() => {
    setNotebooks((nbs) => {
      const known = new Set(nbs.map((n) => n.id));
      const missing = [...new Set(entries.map((e) => e.category))].filter(
        (id) => id && !known.has(id),
      );
      if (missing.length === 0) return nbs;
      const next = [
        ...nbs,
        ...missing.map((id) => ({ id, label: notebookLabel(id), color: '#C4A060' })),
      ];
      try {
        localStorage.setItem(NOTEBOOK_STORAGE, JSON.stringify(next));
      } catch {
        /* */
      }
      return next;
    });
  }, [entries]);

  function saveNotebooks(nbs: Notebook[]) {
    setNotebooks(nbs);
    localStorage.setItem(NOTEBOOK_STORAGE, JSON.stringify(nbs));
  }

  function saveNoteStyle(
    id: string,
    style: { color: string; font: string; align: string; size?: string },
  ) {
    const updated = { ...noteStyles, [id]: style };
    setNoteStyles(updated);
    localStorage.setItem('colourmap:note-styles', JSON.stringify(updated));
  }

  function getNoteStyle(id: string) {
    return noteStyles[id] || { color: 'transparent', font: 'inherit', align: 'left', size: '16' };
  }

  async function handleAdd() {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    // Create locally first so it works without API
    const localEntry: Entry = {
      id: crypto.randomUUID(),
      category: activeNotebook,
      title: newTitle.trim(),
      content: null,
      tags: null,
      createdAt: new Date().toISOString(),
    };
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
      } else {
        // API failed — use local entry
        setEntries((prev) => [localEntry, ...prev]);
        setNewTitle('');
        setExpandedId(localEntry.id);
        setEditingId(localEntry.id);
      }
    } catch {
      // Network error — use local entry
      setEntries((prev) => [localEntry, ...prev]);
      setNewTitle('');
      setExpandedId(localEntry.id);
      setEditingId(localEntry.id);
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

  function handleDelete(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    // Soft-delete: move to trash with timestamp
    const deleted = { ...entry, deletedAt: new Date().toISOString() };
    const nextTrash = [deleted, ...trashEntries];
    setTrashEntries(nextTrash);
    try {
      localStorage.setItem(TRASH_STORAGE, JSON.stringify(nextTrash));
    } catch {
      /* */
    }
    // Remove from active entries
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (expandedId === id) {
      setExpandedId(null);
      setEditingId(null);
    }
    // Also delete from server so it doesn't come back on next fetch
    fetch(`/api/notebook/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  async function handleRestore(id: string) {
    const entry = trashEntries.find((e) => e.id === id);
    if (!entry) return;
    const { deletedAt: _d, ...base } = entry;
    // Re-create on server
    try {
      const res = await fetch('/api/notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: base.category, title: base.title }),
      });
      const created = res.ok ? await res.json() : { ...base, id: base.id };
      setEntries((prev) => [{ ...base, id: created.id }, ...prev]);
    } catch {
      setEntries((prev) => [base, ...prev]);
    }
    const nextTrash = trashEntries.filter((e) => e.id !== id);
    setTrashEntries(nextTrash);
    try {
      localStorage.setItem(TRASH_STORAGE, JSON.stringify(nextTrash));
    } catch {
      /* */
    }
    setActiveNotebook(entry.category);
  }

  function handlePermanentDelete(id: string) {
    const nextTrash = trashEntries.filter((e) => e.id !== id);
    setTrashEntries(nextTrash);
    try {
      localStorage.setItem(TRASH_STORAGE, JSON.stringify(nextTrash));
    } catch {
      /* */
    }
  }

  function handleDragStart(id: string) {
    setDragId(id);
  }
  function handleDragOver(id: string, e: React.DragEvent) {
    e.preventDefault();
    if (id !== dragId) setDragOverId(id);
  }
  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = notebooks.findIndex((n) => n.id === dragId);
    const to = notebooks.findIndex((n) => n.id === targetId);
    if (from === -1 || to === -1) return;
    const next = [...notebooks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    saveNotebooks(next);
    setDragId(null);
    setDragOverId(null);
  }
  function handleDragEnd() {
    setDragId(null);
    setDragOverId(null);
  }

  function commitRenameNb(id: string) {
    const trimmed = renameNbValue.trim();
    if (trimmed) {
      const next = notebooks.map((nb) => (nb.id === id ? { ...nb, label: trimmed } : nb));
      saveNotebooks(next);
    }
    setRenamingNbId(null);
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
    <>
      <main className="mx-auto max-w-2xl px-3 py-4 md:px-0 md:py-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p
            className="text-[15px] font-normal tracking-[0.08em] font-serif"
            style={{ color: '#5C3018' }}
          >
            Notebook
          </p>
        </div>

        {/* On phone: notebook tabs are a horizontal scroll strip above the notes.
          On md+: classic side-by-side layout with fixed 140px left column. */}
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          {/* ========== LEFT: NOTEBOOK TABS (vertical on md+, horizontal scroll on phone) ========== */}
          <div className="md:w-[140px] md:shrink-0 md:space-y-1">
            {/* On phone: single collapsed pill → tap to expand all categories */}
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setShowNbMenu((s) => !s)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                style={{
                  background: activeNb ? `${activeNb.color}18` : 'transparent',
                  border: `1px solid ${activeNb ? `${activeNb.color}40` : '#C4A06040'}`,
                  color: activeNb?.color ?? '#C4A060',
                }}
              >
                {activeNb?.label ?? 'Notebook'}
                <span
                  className="transition-transform duration-200"
                  style={{ fontSize: 8, transform: showNbMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ▾
                </span>
              </button>
              {showNbMenu && (
                <div className="mt-2 flex flex-wrap gap-2 pb-1">
                  {notebooks.map((nb) => {
                    const isActive = activeNotebook === nb.id;
                    const isDragging = dragId === nb.id;
                    const isOver = dragOverId === nb.id;
                    return (
                      <button
                        key={nb.id}
                        type="button"
                        draggable
                        onDragStart={() => handleDragStart(nb.id)}
                        onDragOver={(e) => handleDragOver(nb.id, e)}
                        onDrop={() => handleDrop(nb.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          setActiveNotebook(nb.id);
                          setShowNbMenu(false);
                        }}
                        className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                        style={{
                          background: isActive ? `${nb.color}18` : 'transparent',
                          border: `1px solid ${isOver ? `${nb.color}80` : isActive ? `${nb.color}40` : `${nb.color}18`}`,
                          color: isActive ? nb.color : `${nb.color}60`,
                          whiteSpace: 'nowrap',
                          opacity: isDragging ? 0.35 : 1,
                          cursor: 'grab',
                          outline: isOver ? `2px solid ${nb.color}40` : undefined,
                          outlineOffset: isOver ? 2 : undefined,
                        }}
                      >
                        {nb.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {/* On md+: vertical list (existing layout, hidden on phone) */}
            <div className="hidden md:block space-y-1">
              {/* General notebooks */}
              <p
                className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: '#8A6A4A', opacity: 0.5 }}
              >
                General
              </p>
              {notebooks
                .filter((nb) => !nb.isMusic)
                .map((nb) => {
                  const isActive = activeNotebook === nb.id;
                  const count = entries.filter((e) => e.category === nb.id).length;
                  const isRenaming = renamingNbId === nb.id;
                  const isDragging = dragId === nb.id;
                  const isOver = dragOverId === nb.id;
                  return (
                    <div
                      key={nb.id}
                      draggable
                      onDragStart={() => handleDragStart(nb.id)}
                      onDragOver={(e) => handleDragOver(nb.id, e)}
                      onDrop={() => handleDrop(nb.id)}
                      onDragEnd={handleDragEnd}
                      className="group flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer"
                      style={{
                        background: isActive ? `${nb.color}15` : 'transparent',
                        border: isOver
                          ? `1px solid ${nb.color}60`
                          : isActive
                            ? `1px solid ${nb.color}30`
                            : '1px solid transparent',
                        opacity: isDragging ? 0.35 : 1,
                      }}
                      onClick={() => !isRenaming && setActiveNotebook(nb.id)}
                    >
                      <span
                        className="shrink-0 opacity-0 group-hover:opacity-30 transition-opacity select-none"
                        style={{ fontSize: 9, color: nb.color, cursor: 'grab', lineHeight: 1 }}
                      >
                        ⠿
                      </span>
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ background: nb.color, opacity: isActive ? 0.8 : 0.3 }}
                      />
                      <div className="flex-1 min-w-0">
                        {isRenaming ? (
                          <input
                            type="text"
                            value={renameNbValue}
                            onChange={(e) => setRenameNbValue(e.target.value)}
                            onBlur={() => commitRenameNb(nb.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRenameNb(nb.id);
                              if (e.key === 'Escape') setRenamingNbId(null);
                            }}
                            autoFocus
                            className="w-full bg-transparent text-xs outline-none border-b"
                            style={{ color: nb.color, borderColor: `${nb.color}40` }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <p
                            className="text-xs font-medium truncate"
                            style={{ color: isActive ? nb.color : `${nb.color}80` }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setRenamingNbId(nb.id);
                              setRenameNbValue(nb.label);
                            }}
                            title="Double-click to rename"
                          >
                            {nb.label}
                          </p>
                        )}
                        {count > 0 && (
                          <p className="text-[11px]" style={{ color: `${nb.color}40` }}>
                            {count}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

              {/* Music notebooks — collapsible */}
              <button
                type="button"
                onClick={() => setShowMusic((s) => !s)}
                className="flex w-full cursor-pointer items-center gap-1.5 px-3 pt-3"
                style={{ background: 'none', border: 'none' }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: '#9B6BA0', opacity: 0.5 }}
                >
                  Music
                </p>
                <span
                  className="text-[8px] transition-transform duration-200"
                  style={{
                    color: '#9B6BA050',
                    transform: showMusic ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  ▾
                </span>
              </button>
              {showMusic &&
                notebooks
                  .filter((nb) => nb.isMusic)
                  .map((nb) => {
                    const isActive = activeNotebook === nb.id;
                    const count = entries.filter((e) => e.category === nb.id).length;
                    const isDragging = dragId === nb.id;
                    const isOver = dragOverId === nb.id;
                    return (
                      <button
                        key={nb.id}
                        type="button"
                        draggable
                        onDragStart={() => handleDragStart(nb.id)}
                        onDragOver={(e) => handleDragOver(nb.id, e)}
                        onDrop={() => handleDrop(nb.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setActiveNotebook(nb.id)}
                        className="group w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
                        style={{
                          background: isActive ? `${nb.color}15` : 'transparent',
                          border: isOver
                            ? `1px solid ${nb.color}60`
                            : isActive
                              ? `1px solid ${nb.color}30`
                              : '1px solid transparent',
                          opacity: isDragging ? 0.35 : 1,
                          cursor: 'grab',
                        }}
                      >
                        <span
                          className="shrink-0 opacity-0 group-hover:opacity-30 transition-opacity select-none"
                          style={{ fontSize: 9, color: nb.color, lineHeight: 1 }}
                        >
                          ⠿
                        </span>
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ background: nb.color, opacity: isActive ? 0.8 : 0.3 }}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs font-medium truncate"
                            style={{ color: isActive ? nb.color : `${nb.color}80` }}
                          >
                            {nb.label}
                          </p>
                          {count > 0 && (
                            <p className="text-[11px]" style={{ color: `${nb.color}40` }}>
                              {count}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}

              {/* Deleted (trash) virtual notebook */}
              {trashEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveNotebook(DELETED_NB_ID)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
                  style={{
                    background: activeNotebook === DELETED_NB_ID ? '#D4605A15' : 'transparent',
                    border:
                      activeNotebook === DELETED_NB_ID
                        ? '1px solid #D4605A30'
                        : '1px solid transparent',
                  }}
                >
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{
                      background: '#D4605A',
                      opacity: activeNotebook === DELETED_NB_ID ? 0.8 : 0.3,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium truncate"
                      style={{ color: activeNotebook === DELETED_NB_ID ? '#D4605A' : '#D4605A80' }}
                    >
                      Deleted
                    </p>
                    <p className="text-[11px]" style={{ color: '#D4605A40' }}>
                      {trashEntries.length}
                    </p>
                  </div>
                </button>
              )}

              {/* Add notebook */}
              <button
                type="button"
                onClick={() => setShowAddNotebook(!showAddNotebook)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all hover:bg-accent/30"
              >
                <span className="text-sm opacity-30">+</span>
                <span className="text-xs text-muted-foreground/50">New notebook</span>
              </button>

              {showAddNotebook && (
                <div className="p-2 rounded-xl border border-border/50 space-y-2 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={newNbName}
                    onChange={(e) => setNewNbName(e.target.value)}
                    placeholder="Name..."
                    className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none"
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
                        { id, label: newNbName.trim(), color: newNbColor },
                      ]);
                      setActiveNotebook(id);
                      setNewNbName('');
                      setShowAddNotebook(false);
                    }}
                    className="w-full text-xs py-1 rounded-lg font-medium disabled:opacity-30"
                    style={{ color: newNbColor, background: `${newNbColor}10` }}
                  >
                    Create
                  </button>
                </div>
              )}
            </div>
            {/* end md:block vertical list */}
          </div>

          {/* ========== RIGHT: NOTES ========== */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Notebook header */}
            <div className="flex flex-col items-center gap-1 mb-3">
              <div
                className="h-3 w-3 rounded-full mb-0.5"
                style={{
                  background: activeNotebook === DELETED_NB_ID ? '#D4605A' : activeNb?.color,
                  opacity: 0.7,
                }}
              />
              <h2
                className="font-serif text-center"
                style={{
                  color: activeNotebook === DELETED_NB_ID ? '#D4605A' : activeNb?.color,
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                {activeNotebook === DELETED_NB_ID ? 'Deleted' : activeNb?.label}
              </h2>
              {activeNotebook === DELETED_NB_ID && (
                <span
                  className="text-xs"
                  style={{ color: '#D4605A80', fontFamily: 'var(--font-serif)' }}
                >
                  Recoverable for {TRASH_TTL_DAYS} days
                </span>
              )}
            </div>

            {/* Deleted / Trash view */}
            {activeNotebook === DELETED_NB_ID && (
              <div className="space-y-2">
                {trashEntries.length === 0 ? (
                  <p
                    className="text-center text-sm py-8"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Trash is empty
                  </p>
                ) : (
                  trashEntries.map((entry) => {
                    const daysLeft = Math.ceil(
                      (new Date(entry.deletedAt).getTime() +
                        TRASH_TTL_DAYS * 86400_000 -
                        Date.now()) /
                        86400_000,
                    );
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 rounded-xl px-4 py-3"
                        style={{ background: '#D4605A08', border: '1px solid #D4605A18' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[13px] truncate"
                            style={{ color: 'var(--foreground)', opacity: 0.6 }}
                          >
                            {entry.title}
                          </p>
                          <p
                            className="text-[11px] mt-0.5"
                            style={{
                              color: 'var(--muted-foreground)',
                              fontFamily: 'var(--font-serif)',
                            }}
                          >
                            {daysLeft > 0 ? `${daysLeft}d left` : 'expires today'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRestore(entry.id)}
                          className="cursor-pointer rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-all hover:opacity-80"
                          style={{
                            background: '#C4A06015',
                            color: '#C4A060',
                            border: '1px solid #C4A06030',
                          }}
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(entry.id)}
                          className="cursor-pointer text-[11px] transition-all hover:opacity-80"
                          style={{ color: '#D4605A60', background: 'none', border: 'none' }}
                          title="Permanently delete"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Recordings tab — special UI, no note form */}
            {activeNotebook === 'recordings' && (
              <MusicRecordings
                songs={entries
                  .filter((e) => e.category === 'song_ideas')
                  .map((e) => ({ id: e.id, title: e.title }))}
              />
            )}

            {/* Art ideas — themes, the ideas under each theme, a gallery per idea */}
            {activeNotebook === 'art_ideas' && (
              <ArtIdeas
                entries={filtered}
                onChanged={fetchEntries}
                color={activeNb?.color || '#B05A8A'}
              />
            )}

            {/* Add note + notes list — hidden for recordings, art ideas and deleted tabs */}
            {activeNotebook !== 'recordings' &&
              activeNotebook !== 'art_ideas' &&
              activeNotebook !== DELETED_NB_ID && (
                <>
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
                      className="flex-1 rounded-lg border px-3 py-2.5 outline-none placeholder:italic placeholder:text-[#8A6A4A] placeholder:opacity-60"
                      style={{
                        borderColor: `${activeNb?.color || '#C4A060'}20`,
                        background: `${activeNb?.color || '#C4A060'}05`,
                        fontFamily: 'var(--font-serif)',
                        fontSize: '15px',
                        color: '#5C3018',
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
                      <div
                        className="h-8 w-8 rounded-full mx-auto"
                        style={{ background: activeNb?.color, opacity: 0.1 }}
                      />
                      <p className="text-sm text-muted-foreground/50 mt-2">No notes yet</p>
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
                      ? entries.filter(
                          (e) => e.category === 'song_ideas' && e.tags?.includes(entry.id),
                        )
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
                            onClick={() => {
                              setExpandedId(entry.id);
                              setEditingId(entry.id);
                            }}
                            className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-all hover:bg-[#C4A06008]"
                            style={{ background: 'none', border: 'none' }}
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: color, opacity: 0.55 }}
                            />
                            <div className="flex-1 min-w-0">
                              <p
                                className="truncate"
                                style={{
                                  fontFamily: 'var(--font-serif)',
                                  fontSize: '17px',
                                  fontWeight: 700,
                                  color: '#5C3018',
                                }}
                              >
                                {entry.title}
                              </p>
                              {entry.content && (
                                <p
                                  className="truncate mt-0.5"
                                  style={{
                                    fontFamily: 'var(--font-serif)',
                                    fontSize: '12px',
                                    color: '#8A6A4A',
                                    opacity: 0.5,
                                  }}
                                >
                                  {entry.content
                                    .replace(/<[^>]*>/g, '')
                                    .replace(/\|\|\|CHORDS\|\|\|.*/, '')
                                    .slice(0, 60)}
                                </p>
                              )}
                            </div>
                            <span
                              style={{
                                fontFamily: 'var(--font-serif)',
                                fontSize: '11px',
                                color: '#8A6A4A',
                                opacity: 0.4,
                              }}
                            >
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
                            {/* Title bar + close. A tap anywhere on the bar outside the
                              title and its buttons folds the note again, so a note
                              read is closed where the eye already is. The title keeps
                              to the width of its text so the bar has room to tap;
                              keyboard users have the close button. */}
                            <div
                              className="px-4 pt-3 pb-2 flex items-center gap-3 cursor-pointer"
                              style={{ borderBottom: `1px solid ${color}15` }}
                              title="Tap to close"
                              onClick={(e) => {
                                if ((e.target as HTMLElement).closest('input, button')) return;
                                setExpandedId(null);
                                setEditingId(null);
                              }}
                            >
                              <div
                                className="w-2 h-8 rounded-full shrink-0"
                                style={{ background: color, opacity: 0.5 }}
                              />
                              <input
                                type="text"
                                value={entry.title}
                                onChange={(e) => updateLocal(entry.id, 'title', e.target.value)}
                                className="min-w-[4ch] max-w-full bg-transparent outline-none cursor-text"
                                style={{
                                  fieldSizing: 'content',
                                  color: '#5C3018',
                                  fontFamily: 'var(--font-serif)',
                                  fontSize: '17px',
                                  fontWeight: 700,
                                  textAlign: style.align as 'left' | 'center' | 'right',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setSpellCheckOn((s) => !s)}
                                className="flex cursor-pointer items-center justify-center rounded-full px-2.5 py-1 transition-all"
                                style={{
                                  background: spellCheckOn ? `${color}08` : 'transparent',
                                  border: `1px solid ${spellCheckOn ? `${color}20` : `${color}10`}`,
                                  fontFamily: 'var(--font-serif)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: spellCheckOn ? color : `${color}60`,
                                }}
                                title={
                                  spellCheckOn
                                    ? 'Spell check on (tap to turn off)'
                                    : 'Spell check off'
                                }
                              >
                                abc
                              </button>
                              <button
                                type="button"
                                onClick={() => setFullViewId(entry.id)}
                                className="flex cursor-pointer items-center justify-center rounded-full px-3 py-1 transition-all"
                                style={{
                                  background: `${color}08`,
                                  border: `1px solid ${color}15`,
                                  fontFamily: 'var(--font-serif)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color,
                                  opacity: 0.7,
                                }}
                                title="Full view (Esc to exit)"
                              >
                                expand
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedId(null);
                                  setEditingId(null);
                                }}
                                className="flex cursor-pointer items-center justify-center rounded-full px-3 py-1 transition-all"
                                style={{
                                  background: `${color}10`,
                                  border: `1px solid ${color}20`,
                                  fontFamily: 'var(--font-serif)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color,
                                }}
                              >
                                close
                              </button>
                            </div>

                            {/* Format toolbar */}
                            <div className="px-4 py-1 border-b border-border/20">
                              <FormatToolbar
                                noteColor={style.color}
                                onNoteColor={(c) => saveNoteStyle(entry.id, { ...style, color: c })}
                                noteFont={style.font}
                                onNoteFont={(f) => saveNoteStyle(entry.id, { ...style, font: f })}
                                noteSize={style.size || '16'}
                                onNoteSize={(s) => saveNoteStyle(entry.id, { ...style, size: s })}
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
                                    updateLocal(
                                      entry.id,
                                      'content',
                                      c.trim() ? `${l}|||CHORDS|||${c}` : l,
                                    );
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
                                            spellCheck={spellCheckOn}
                                            lang="en-US"
                                            onInput={(e) => {
                                              const t = e.target as HTMLTextAreaElement;
                                              t.style.height = 'auto';
                                              t.style.height = `${t.scrollHeight}px`;
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
                                              t.style.height = `${t.scrollHeight}px`;
                                            }}
                                          />
                                        </>
                                      ) : (
                                        <div
                                          onClick={() => setEditingId(entry.id)}
                                          className="cursor-text"
                                        >
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
                                        context={[entry.title, lyrics, chords]
                                          .filter(Boolean)
                                          .join('\n')}
                                      />
                                    </div>
                                  );
                                })()
                              ) : (
                                <div
                                  id="note-editor"
                                  contentEditable
                                  suppressContentEditableWarning
                                  ref={(el) => {
                                    if (el && isEditing && !el.innerHTML && entry.content) {
                                      el.innerHTML = entry.content;
                                    }
                                    if (el && isEditing && !entry.content && el.innerHTML === '') {
                                      el.focus();
                                    }
                                  }}
                                  onInput={(e) => {
                                    const html = (e.target as HTMLDivElement).innerHTML;
                                    updateLocal(entry.id, 'content', html === '<br>' ? '' : html);
                                  }}
                                  className="w-full min-h-[200px] rounded-lg border border-border/20 bg-transparent p-3 outline-none"
                                  style={{
                                    color: '#5A4535',
                                    fontFamily: style.font || 'var(--font-serif)',
                                    fontSize: `${style.size || 16}px`,
                                    textAlign: style.align as 'left' | 'center' | 'right',
                                    lineHeight: 1.6,
                                  }}
                                  data-placeholder="start writing..."
                                  spellCheck={spellCheckOn}
                                  lang="en-US"
                                />
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
                                            prev.map((e) =>
                                              e.id === entry.id ? { ...e, tags: next } : e,
                                            ),
                                          );
                                          fetch(`/api/notebook/${entry.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ tags: next }),
                                          });
                                        }}
                                        className="px-2 py-0.5 rounded-lg text-[11px] font-medium"
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
                                <span className="text-[11px] text-muted-foreground/40">
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
                                      className="cursor-pointer rounded-full px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition-all hover:opacity-80"
                                      style={{ background: '#C4A060', color: '#fff' }}
                                    >
                                      Done
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setEditingId(entry.id)}
                                      className="cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition-all hover:opacity-80"
                                      style={{
                                        background: '#C4A06015',
                                        color: '#C4A060',
                                        border: '1px solid #C4A06030',
                                      }}
                                    >
                                      Edit
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(entry.id)}
                                    className="text-xs text-muted-foreground/40 hover:text-destructive"
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
                </>
              )}
          </div>
        </div>
      </main>
      {fullViewId &&
        (() => {
          const fEntry = entries.find((e) => e.id === fullViewId);
          if (!fEntry) return null;
          const fEntryId = fEntry.id;
          const fNb = notebooks.find((n) => n.id === fEntry.category);
          const fColor = fNb?.color || '#C4A060';
          const fStyle = getNoteStyle(fEntry.id);
          const fIsSong = fEntry.category === 'song_ideas';
          return (
            <div
              className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
              style={{ background: 'var(--background)' }}
            >
              {/* Top bar */}
              <div
                className="flex shrink-0 items-center gap-3 border-b px-5 py-3"
                style={{ borderColor: `${fColor}20` }}
              >
                <div
                  className="w-2 h-8 rounded-full shrink-0"
                  style={{ background: fColor, opacity: 0.5 }}
                />
                <input
                  type="text"
                  value={fEntry.title}
                  onChange={(e) => updateLocal(fEntry.id, 'title', e.target.value)}
                  className="flex-1 bg-transparent outline-none"
                  style={{
                    color: '#5C3018',
                    fontFamily: 'var(--font-serif)',
                    fontSize: '20px',
                    fontWeight: 700,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setFullViewId(null)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 transition-all"
                  style={{
                    background: `${fColor}10`,
                    border: `1px solid ${fColor}25`,
                    fontFamily: 'var(--font-serif)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: fColor,
                  }}
                >
                  ✕ exit
                </button>
              </div>

              {/* Format toolbar */}
              <div className="shrink-0 border-b border-border/20 px-5 py-1">
                <FormatToolbar
                  noteColor={fStyle.color}
                  onNoteColor={(c) => saveNoteStyle(fEntry.id, { ...fStyle, color: c })}
                  noteFont={fStyle.font}
                  onNoteFont={(f) => saveNoteStyle(fEntry.id, { ...fStyle, font: f })}
                  noteSize={fStyle.size || '16'}
                  onNoteSize={(s) => saveNoteStyle(fEntry.id, { ...fStyle, size: s })}
                  align={fStyle.align}
                  onAlign={(a) => saveNoteStyle(fEntry.id, { ...fStyle, align: a })}
                />
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {fIsSong ? (
                  (() => {
                    const parts = (fEntry.content || '').split('|||CHORDS|||');
                    const lyrics = parts[0] || '';
                    const chords = parts[1] || '';
                    function updateSong(l: string, c: string) {
                      updateLocal(fEntryId, 'content', c.trim() ? `${l}|||CHORDS|||${c}` : l);
                    }
                    return (
                      <div className="space-y-4 max-w-2xl mx-auto">
                        <div style={{ position: 'relative' }}>
                          <textarea
                            value={lyrics}
                            onChange={(e) => updateSong(e.target.value, chords)}
                            placeholder="Lyrics…"
                            className="w-full resize-none rounded-xl border px-4 py-3 outline-none"
                            style={{
                              minHeight: 280,
                              fontFamily:
                                fStyle.font === 'mono'
                                  ? 'monospace'
                                  : fStyle.font === 'serif'
                                    ? 'var(--font-serif)'
                                    : 'sans-serif',
                              fontSize: `${fStyle.size || 16}px`,
                              textAlign: fStyle.align as 'left' | 'center' | 'right',
                              color: fStyle.color || '#5C3018',
                              borderColor: `${fColor}20`,
                              background: `${fColor}04`,
                              paddingRight: lyrics.length > 0 ? 28 : undefined,
                            }}
                            spellCheck
                            lang="en-US"
                          />
                          <span style={{ position: 'absolute', right: 8, bottom: 10 }}>
                            <MicDot
                              visible={lyrics.length > 0}
                              value={lyrics}
                              onTranscript={(v) => updateSong(v, chords)}
                            />
                          </span>
                        </div>
                        <textarea
                          value={chords}
                          onChange={(e) => updateSong(lyrics, e.target.value)}
                          placeholder="Chords…"
                          className="w-full resize-none rounded-xl border px-4 py-3 font-mono outline-none"
                          style={{
                            minHeight: 80,
                            fontSize: '13px',
                            color: '#8A6A4A',
                            borderColor: `${fColor}15`,
                            background: `${fColor}03`,
                          }}
                        />
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ position: 'relative' }}>
                    <textarea
                      value={fEntry.content || ''}
                      onChange={(e) => updateLocal(fEntry.id, 'content', e.target.value)}
                      placeholder="Write…"
                      className="w-full resize-none bg-transparent outline-none max-w-2xl mx-auto block"
                      style={{
                        minHeight: 'calc(100vh - 200px)',
                        fontFamily:
                          fStyle.font === 'mono'
                            ? 'monospace'
                            : fStyle.font === 'serif'
                              ? 'var(--font-serif)'
                              : 'sans-serif',
                        fontSize: `${fStyle.size || 16}px`,
                        textAlign: fStyle.align as 'left' | 'center' | 'right',
                        color: fStyle.color || '#5C3018',
                        paddingRight: (fEntry.content || '').length > 0 ? 28 : undefined,
                      }}
                      spellCheck
                      lang="en-US"
                    />
                    <span style={{ position: 'fixed', right: 20, bottom: 24 }}>
                      <MicDot
                        visible={(fEntry.content || '').length > 0}
                        value={fEntry.content || ''}
                        onTranscript={(v) => updateLocal(fEntry.id, 'content', v)}
                      />
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </>
  );
}
