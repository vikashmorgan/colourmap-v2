'use client';

import { useCallback, useEffect, useState } from 'react';

/*
 * The Art ideas notebook: themes, the ideas that grow out of each theme, and a
 * gallery of pictures for each idea.
 *
 * Everything is an ordinary notebook entry in the category `art_ideas`:
 *   a theme  — any entry not tagged "idea" (so the themes already written stay themes)
 *   an idea  — tagged "idea" and "theme:<theme id>", which puts it under its theme
 * Pictures live in private storage, one folder per idea (/api/art/gallery/<idea id>).
 */

export type ArtEntry = {
  id: string;
  category: string;
  title: string;
  content: string | null;
  tags: string[] | null;
  createdAt: string;
};

type Image = { name: string; url: string };

const INK = '#5C3018';
const MUTED = '#8A6A4A';

export const isIdea = (e: ArtEntry) => !!e.tags?.includes('idea');
export const themeOf = (e: ArtEntry) =>
  e.tags?.find((t) => t.startsWith('theme:'))?.slice('theme:'.length) ?? null;

/* Notebook text is stored as <div> lines; shown and edited here as plain text. */
export function htmlToText(html: string | null): string {
  if (!html) return '';
  return html
    .replace(/<div><br\s*\/?><\/div>/gi, '<div></div>')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n+$/, '')
    .trim();
}
export function textToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .split('\n')
    .map((line) => (line.trim() ? `<div>${esc(line)}</div>` : '<div><br></div>'))
    .join('');
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url} failed`);
  return res;
}

function AddRow({
  placeholder,
  onAdd,
  color,
}: {
  placeholder: string;
  onAdd: (title: string) => Promise<void>;
  color: string;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!value.trim() || busy) return;
        setBusy(true);
        try {
          await onAdd(value.trim());
          setValue('');
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 rounded-lg border px-3 py-2 outline-none placeholder:italic"
        style={{
          borderColor: `${color}30`,
          background: `${color}06`,
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          color: INK,
        }}
      />
      {value.trim() && (
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ color, background: `${color}14` }}
        >
          {busy ? '…' : 'Add'}
        </button>
      )}
    </form>
  );
}

/* Text of a theme or an idea: shown as written, edited in place, saved on leaving the box. */
function EditableText({
  entry,
  onSaved,
  color,
  placeholder,
}: {
  entry: ArtEntry;
  onSaved: () => void;
  color: string;
  placeholder: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(htmlToText(entry.content));
  useEffect(() => setText(htmlToText(entry.content)), [entry.content]);
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full cursor-text rounded-lg px-1 py-1 text-left"
        style={{
          background: 'none',
          border: 'none',
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          lineHeight: 1.6,
          color: text ? INK : MUTED,
          whiteSpace: 'pre-wrap',
        }}
        title="Tap to edit"
      >
        {text || placeholder}
      </button>
    );
  }
  return (
    <textarea
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={async () => {
        setEditing(false);
        if (text.trim() === htmlToText(entry.content)) return;
        await send(`/api/notebook/${entry.id}`, 'PATCH', { content: textToHtml(text.trim()) });
        onSaved();
      }}
      rows={Math.max(4, text.split('\n').length + 1)}
      className="w-full rounded-lg border px-3 py-2 outline-none"
      style={{
        borderColor: `${color}40`,
        fontFamily: 'var(--font-serif)',
        fontSize: 15,
        lineHeight: 1.6,
        color: INK,
      }}
    />
  );
}

export function Gallery({ ideaId, color }: { ideaId: string; color: string }) {
  const [images, setImages] = useState<Image[] | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(0);
  const [viewing, setViewing] = useState<Image | null>(null);
  const [armed, setArmed] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/art/gallery/${ideaId}`);
      if (!res.ok) throw new Error();
      setImages((await res.json()).images);
    } catch {
      setError('The gallery could not be loaded.');
      setImages([]);
    }
  }, [ideaId]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewing(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewing]);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    const list = [...files];
    setUploading(list.length);
    for (const file of list) {
      const form = new FormData();
      form.set('file', file);
      const res = await fetch(`/api/art/gallery/${ideaId}`, { method: 'POST', body: form });
      if (!res.ok)
        setError(`${file.name}: ${(await res.json().catch(() => ({}))).error ?? 'not added'}`);
      setUploading((n) => n - 1);
    }
    await load();
  }

  async function remove(name: string) {
    if (armed !== name) {
      setArmed(name);
      setTimeout(() => setArmed((a) => (a === name ? '' : a)), 3000);
      return;
    }
    await send(`/api/art/gallery/${ideaId}?name=${encodeURIComponent(name)}`, 'DELETE');
    setArmed('');
    setViewing(null);
    await load();
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3">
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: MUTED,
          }}
        >
          Gallery{images ? ` · ${images.length}` : ''}
        </span>
        <label
          className="cursor-pointer rounded-full px-3 py-1 text-xs font-semibold"
          style={{ color, background: `${color}14`, border: `1px solid ${color}30` }}
        >
          {uploading ? `Adding ${uploading}…` : '+ Add pictures'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => {
              add(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {error && (
        <p className="text-xs" style={{ color: '#B4532A' }}>
          {error}
        </p>
      )}
      {images === null && (
        <p className="text-xs" style={{ color: MUTED }}>
          Loading…
        </p>
      )}
      {images && images.length === 0 && !uploading && (
        <p className="text-xs italic" style={{ color: MUTED }}>
          No pictures yet: sketches, references, photos of the work in progress.
        </p>
      )}
      {images && images.length > 0 && (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}
        >
          {images.map((img) => (
            <button
              key={img.name}
              type="button"
              onClick={() => setViewing(img)}
              className="relative overflow-hidden rounded-lg"
              style={{
                aspectRatio: '1',
                border: `1px solid ${color}25`,
                padding: 0,
                background: `${color}08`,
              }}
            >
              <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {viewing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          style={{ background: 'rgb(0 0 0 / .8)' }}
          onClick={() => setViewing(null)}
        >
          <img src={viewing.url} alt="" className="max-h-[80vh] max-w-full rounded-lg" />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(viewing.name);
              }}
              className="rounded-full px-4 py-2 text-sm font-semibold"
              style={{
                background: armed === viewing.name ? '#B4532A' : '#ffffff22',
                color: '#fff',
              }}
            >
              {armed === viewing.name ? 'Delete?' : 'Remove'}
            </button>
            <button
              type="button"
              onClick={() => setViewing(null)}
              className="rounded-full px-4 py-2 text-sm font-semibold"
              style={{ background: '#fff', color: INK }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArtIdeas({
  entries,
  onChanged,
  color,
}: {
  entries: ArtEntry[];
  onChanged: () => void;
  color: string;
}) {
  const [openIdea, setOpenIdea] = useState<string | null>(null);
  const byDate = (a: ArtEntry, b: ArtEntry) => a.createdAt.localeCompare(b.createdAt);
  const themes = entries.filter((e) => !isIdea(e)).sort(byDate);
  const ideasOf = (themeId: string) =>
    entries.filter((e) => isIdea(e) && themeOf(e) === themeId).sort(byDate);

  async function addTheme(title: string) {
    await send('/api/notebook', 'POST', {
      category: 'art_ideas',
      title,
      content: '',
      tags: ['theme'],
    });
    onChanged();
  }
  async function addIdea(themeId: string, title: string) {
    const res = await send('/api/notebook', 'POST', {
      category: 'art_ideas',
      title,
      content: '',
      tags: ['idea', `theme:${themeId}`],
    });
    const created = await res.json().catch(() => null);
    onChanged();
    if (created?.id) setOpenIdea(created.id);
  }

  return (
    <div className="grid gap-5">
      <AddRow placeholder="A new theme you are reflecting on…" onAdd={addTheme} color={color} />
      {themes.length === 0 && (
        <p className="py-8 text-center text-sm italic" style={{ color: MUTED }}>
          No themes yet. Start with a question you keep coming back to.
        </p>
      )}
      {themes.map((theme, ti) => {
        const ideas = ideasOf(theme.id);
        return (
          <section
            key={theme.id}
            className="grid gap-3 rounded-2xl border p-4"
            style={{ borderColor: `${color}30`, background: `${color}06` }}
            aria-label={`Theme: ${theme.title}`}
          >
            <header className="flex items-baseline gap-3">
              <span
                className="rounded-md px-2 py-0.5 text-xs font-bold"
                style={{ background: color, color: '#fff' }}
              >
                {ti + 1}
              </span>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 20,
                  fontWeight: 700,
                  color: INK,
                  margin: 0,
                }}
              >
                {theme.title.replace(/^Theme\s*\d+\s*·\s*/i, '')}
              </h3>
              <span className="ml-auto text-xs" style={{ color: MUTED }}>
                {ideas.length} idea{ideas.length === 1 ? '' : 's'}
              </span>
            </header>
            <EditableText
              entry={theme}
              onSaved={onChanged}
              color={color}
              placeholder="Write what this theme is about…"
            />
            <div className="grid gap-2 border-l-2 pl-3" style={{ borderColor: `${color}40` }}>
              {ideas.map((idea) => {
                const open = openIdea === idea.id;
                return (
                  <article
                    key={idea.id}
                    className="grid gap-2 rounded-xl border px-3 py-2"
                    style={{ borderColor: `${color}25`, background: '#ffffff80' }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIdea(open ? null : idea.id)}
                      aria-expanded={open}
                      className="flex items-center gap-2 text-left"
                      style={{ background: 'none', border: 'none', padding: 0 }}
                    >
                      <span style={{ color, fontSize: 12 }}>{open ? '▾' : '▸'}</span>
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: 16,
                          fontWeight: 600,
                          color: INK,
                        }}
                      >
                        {idea.title}
                      </span>
                    </button>
                    {open && (
                      <div className="grid gap-3 pb-1">
                        <EditableText
                          entry={idea}
                          onSaved={onChanged}
                          color={color}
                          placeholder="Describe the piece: material, size, what it shows…"
                        />
                        <Gallery ideaId={idea.id} color={color} />
                      </div>
                    )}
                  </article>
                );
              })}
              <AddRow
                placeholder="An idea for a piece, from this theme…"
                onAdd={(t) => addIdea(theme.id, t)}
                color={color}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
