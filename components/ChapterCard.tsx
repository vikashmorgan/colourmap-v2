'use client';

import { useEffect, useRef, useState } from 'react';

export default function ChapterCard({ initial }: { initial?: string }) {
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initial) setTitle(initial);
  }, [initial]);

  function save() {
    const trimmed = title.trim();
    fetch('/api/life-scan-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { chapter_title: trimmed } }),
    }).then(() => {
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  if (!title.trim() && !editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setEditing(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="w-full text-center py-1"
      >
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors">
          name your current chapter
        </span>
      </button>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center justify-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && title.trim()) save();
            if (e.key === 'Escape') setEditing(false);
          }}
          placeholder="Chapter title..."
          className="bg-transparent text-center text-sm font-semibold outline-none placeholder:text-muted-foreground/30"
          style={{ color: '#5C3018' }}
        />
        <button
          type="button"
          onClick={save}
          className="text-[10px] font-medium"
          style={{ color: '#5C3018' }}
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={() => {
          setEditing(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="text-sm font-semibold transition-colors hover:opacity-60"
        style={{ color: '#5C3018' }}
      >
        {title}
      </button>
      {saved && (
        <p className="text-[10px] mt-0.5" style={{ color: '#C4A060' }}>
          saved
        </p>
      )}
    </div>
  );
}
