import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function parseMarkdown(md: string) {
  const lines = md.split('\n');
  const elements: { type: string; content: string; level?: number }[] = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      elements.push({ type: 'h1', content: line.slice(2) });
    } else if (line.startsWith('## ')) {
      elements.push({ type: 'h2', content: line.slice(3) });
    } else if (line.startsWith('### ')) {
      elements.push({ type: 'h3', content: line.slice(4) });
    } else if (line.startsWith('#### ')) {
      elements.push({ type: 'h4', content: line.slice(5) });
    } else if (line.startsWith('- **')) {
      const match = line.match(/^- \*\*(.+?)\*\*\s*[-—:]?\s*(.*)/);
      if (match) {
        elements.push({ type: 'deflist', content: `${match[1]}|||${match[2]}` });
      } else {
        elements.push({ type: 'li', content: line.slice(2) });
      }
    } else if (line.startsWith('- ')) {
      elements.push({ type: 'li', content: line.slice(2) });
    } else if (line.startsWith('> ')) {
      elements.push({ type: 'quote', content: line.slice(2) });
    } else if (line.startsWith('|')) {
      elements.push({ type: 'table', content: line });
    } else if (line.trim() === '---') {
      elements.push({ type: 'hr', content: '' });
    } else if (line.trim()) {
      elements.push({ type: 'p', content: line });
    } else {
      elements.push({ type: 'space', content: '' });
    }
  }

  return elements;
}

function renderInline(text: string) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/\*(.+?)\*/);
    const codeMatch = remaining.match(/`(.+?)`/);

    const matches = [
      boldMatch ? { type: 'bold', match: boldMatch } : null,
      italicMatch ? { type: 'italic', match: italicMatch } : null,
      codeMatch ? { type: 'code', match: codeMatch } : null,
    ].filter(Boolean).sort((a, b) => (a!.match.index ?? 0) - (b!.match.index ?? 0));

    if (matches.length > 0 && matches[0]!.match.index !== undefined) {
      const m = matches[0]!;
      const idx = m.match.index!;
      if (idx > 0) parts.push(remaining.slice(0, idx));
      if (m.type === 'bold') parts.push(<strong key={key++} className="font-semibold">{m.match[1]}</strong>);
      else if (m.type === 'italic') parts.push(<em key={key++}>{m.match[1]}</em>);
      else if (m.type === 'code') parts.push(<code key={key++} className="px-1 py-0.5 rounded bg-accent/50 text-[12px]">{m.match[1]}</code>);
      remaining = remaining.slice(idx + m.match[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }
  return parts;
}

export default function ResearchPage() {
  const filePath = join(process.cwd(), 'docs', 'research.md');
  let content = '';
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    content = '# Research\n\nDocument not found.';
  }

  const elements = parseMarkdown(content);

  return (
    <main className="mx-auto max-w-2xl py-4">
      <article className="space-y-4">
        {elements.map((el, i) => {
          if (el.type === 'h1') {
            return (
              <h1 key={i} className="text-2xl font-normal tracking-[0.05em] font-serif text-center pb-2" style={{ color: '#5C3018' }}>
                {renderInline(el.content)}
              </h1>
            );
          }
          if (el.type === 'h2') {
            return (
              <h2 key={i} className="text-lg font-normal tracking-[0.06em] font-serif pt-6 pb-1" style={{ color: '#5C3018' }}>
                {renderInline(el.content)}
              </h2>
            );
          }
          if (el.type === 'h3') {
            return (
              <h3 key={i} className="text-[15px] font-medium pt-3 pb-0.5" style={{ color: '#7A5438' }}>
                {renderInline(el.content)}
              </h3>
            );
          }
          if (el.type === 'h4') {
            return (
              <h4 key={i} className="text-sm font-semibold pt-2" style={{ color: '#8A6A4A' }}>
                {renderInline(el.content)}
              </h4>
            );
          }
          if (el.type === 'quote') {
            return (
              <blockquote key={i} className="pl-4 border-l-2 text-sm italic" style={{ borderColor: '#C4A06040', color: '#8A7A5A' }}>
                {renderInline(el.content)}
              </blockquote>
            );
          }
          if (el.type === 'li') {
            return (
              <div key={i} className="flex gap-2 pl-2 text-sm leading-relaxed">
                <span className="text-muted-foreground/30 shrink-0 pt-0.5">•</span>
                <span>{renderInline(el.content)}</span>
              </div>
            );
          }
          if (el.type === 'deflist') {
            const [term, def] = el.content.split('|||');
            return (
              <div key={i} className="flex gap-2 pl-2 text-sm leading-relaxed">
                <span className="text-muted-foreground/30 shrink-0 pt-0.5">•</span>
                <span><strong className="font-semibold" style={{ color: '#5C3018' }}>{term}</strong>{def ? ` — ${def}` : ''}</span>
              </div>
            );
          }
          if (el.type === 'hr') {
            return (
              <div key={i} className="flex items-center justify-center gap-3 py-4">
                <div className="flex-1 h-px" style={{ background: '#C4A06015' }} />
                <div className="h-2 w-2 rotate-45 rounded-[1px]" style={{ background: '#C4A060', opacity: 0.2 }} />
                <div className="flex-1 h-px" style={{ background: '#C4A06015' }} />
              </div>
            );
          }
          if (el.type === 'table') {
            return (
              <div key={i} className="text-[11px] font-mono text-muted-foreground/60 overflow-x-auto">
                {el.content}
              </div>
            );
          }
          if (el.type === 'space') return <div key={i} className="h-1" />;
          return (
            <p key={i} className="text-sm leading-relaxed" style={{ color: '#5A4535' }}>
              {renderInline(el.content)}
            </p>
          );
        })}
      </article>
    </main>
  );
}
