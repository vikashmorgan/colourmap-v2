'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { askCollective } from '@/lib/collective/ask-client';
import { ARCHETYPES, DEMO_MEMBERS, type Member } from '@/lib/collective/model';
import { loadMe, saveMe } from '@/lib/collective/storage';
import { linksBetween, sharedThemes, THEMES } from '@/lib/collective/themes';

import CollectiveMap from './CollectiveMap';
import OnboardingSheet from './OnboardingSheet';

const MONO = { fontFamily: 'var(--font-cowboy)' };
const INK = '#efe6d2';
const DIM = '#9fb6c7';
const LINE = 'rgba(143,220,255,.26)';
const themeName = (id: string) => THEMES.find((t) => t.id === id)?.name ?? id;

type Answer =
  | { state: 'idle' }
  | { state: 'busy'; text: string }
  | { state: 'done'; text: string }
  | { state: 'signin' }
  | { state: 'error'; message: string };

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs uppercase tracking-[0.18em]" style={{ ...MONO, color: DIM }}>
      {children}
    </span>
  );
}

function Profile({ m }: { m: Member }) {
  const arch = ARCHETYPES.find((a) => a.id === m.archetype);
  const rows: [string, string[]][] = [
    ['Good at', m.skills],
    ['People come for', m.strengths],
    ['Most comfortable', m.places],
    ['At their best', m.moments],
    ['Wants to make', m.intentions],
  ];
  return (
    <div className="flex flex-col gap-3">
      <Label>
        {arch?.name} · {arch?.line}
      </Label>
      <h2 className="font-serif text-3xl" style={{ color: m.color }}>
        {m.name}
      </h2>
      {m.style && (
        <p className="font-serif text-lg" style={{ color: INK }}>
          {m.style}
        </p>
      )}
      <dl className="flex flex-col gap-2">
        {rows
          .filter(([, xs]) => xs.length)
          .map(([k, xs]) => (
            <div key={k} className="grid grid-cols-[112px_1fr] gap-3 text-sm">
              <dt
                className="pt-0.5 text-xs uppercase tracking-[0.12em]"
                style={{ ...MONO, color: DIM }}
              >
                {k}
              </dt>
              <dd className="font-serif text-base" style={{ color: INK }}>
                {xs.join(' · ')}
              </dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

/** The Collective Brain: the group map, one panel for profiles and combinations, and Ask Claude. */
export default function CollectiveBrain() {
  const [me, setMe] = useState<Member | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [onboarding, setOnboarding] = useState(false);
  const [open, setOpen] = useState(true);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<Answer>({ state: 'idle' });
  const abort = useRef(0);

  useEffect(() => setMe(loadMe()), []);

  const members = useMemo(() => (me ? [...DEMO_MEMBERS, me] : DEMO_MEMBERS), [me]);
  const chosen = members.filter((m) => selected.includes(m.id));
  const group = chosen.length ? chosen : members;
  const links = linksBetween(chosen);
  const themes = sharedThemes(members);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    setAnswer({ state: 'idle' });
    setOpen(true);
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim() || 'What could we make together, and what is the first small step?';
    const run = ++abort.current;
    setAnswer({ state: 'busy', text: '' });
    const out = await askCollective(group, q, (text) => {
      if (run === abort.current) setAnswer({ state: 'busy', text });
    });
    if (run !== abort.current) return;
    if (out.kind === 'done') setAnswer({ state: 'done', text: out.text });
    else if (out.kind === 'signin') setAnswer({ state: 'signin' });
    else setAnswer({ state: 'error', message: out.message });
  }

  function join(next: Member) {
    saveMe(next);
    setMe(next);
    setOnboarding(false);
    setSelected([next.id]);
  }

  const invite = `https://wa.me/?text=${encodeURIComponent(
    'Join our Collective Brain: answer 7 short questions and see how we combine. ',
  )}`;

  return (
    <main
      className="relative h-svh overflow-hidden"
      style={{
        background: '#040b16',
        color: INK,
        backgroundImage:
          'linear-gradient(rgba(143,220,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(143,220,255,.04) 1px,transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
      <header className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 px-4 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-serif text-2xl md:text-3xl" style={{ color: '#e8c27a' }}>
            Collective Brain
          </h1>
          <Label>
            {members.length} stars · {me ? 'you + demo group' : 'demo group'}
          </Label>
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href={invite}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border px-3 py-2 text-xs"
            style={{ ...MONO, borderColor: LINE, color: INK, background: 'rgba(10,26,46,.7)' }}
          >
            Invite
          </a>
          <button
            type="button"
            onClick={() => setOnboarding(true)}
            className="rounded-full px-3 py-2 text-xs"
            style={{ ...MONO, background: '#e8c27a', color: '#1b1406' }}
          >
            {me ? 'Edit me' : '＋ Add yourself'}
          </button>
        </div>
      </header>

      <div
        className={`absolute inset-x-0 top-20 transition-[bottom] md:right-[400px] md:bottom-4 ${open ? 'bottom-[50svh]' : 'bottom-16'}`}
      >
        <CollectiveMap members={members} selected={selected} onToggle={toggle} />
      </div>

      <aside
        aria-label="Collective panel"
        className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[18px] border-t md:inset-auto md:top-24 md:right-4 md:bottom-4 md:w-[380px] md:rounded-[10px] md:border ${open ? 'h-[50svh] md:h-auto' : 'h-14 md:h-14'}`}
        style={{
          background: 'rgba(10,26,46,.82)',
          borderColor: LINE,
          backdropFilter: 'blur(14px)',
        }}
      >
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <Label>
            {chosen.length === 0
              ? 'The group'
              : chosen.length === 1
                ? 'Profile'
                : `Combination · ${chosen.length}`}
          </Label>
          {chosen.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-xs underline"
              style={{ ...MONO, color: DIM }}
            >
              clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? 'Close panel' : 'Open panel'}
            className="ml-auto h-9 w-9 rounded-full border text-sm"
            style={{ borderColor: LINE, color: INK }}
          >
            {open ? '▾' : '▴'}
          </button>
        </div>

        {open && (
          <>
            <div className="flex flex-1 flex-col gap-4 overflow-auto px-4 pb-3">
              {chosen.length === 0 && (
                <>
                  <h2 className="font-serif text-2xl">How this group combines</h2>
                  <p className="font-serif text-base" style={{ color: '#c9d4dd' }}>
                    Each star is a person. Gold lines lead to what two or more want to make. Blue
                    arcs join someone who can help with what another wants. Tap people to combine
                    them, then ask Claude.
                  </p>
                  <ul className="flex flex-col gap-2">
                    {themes.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-baseline gap-3 border-b pb-2"
                        style={{ borderColor: LINE }}
                      >
                        <span className="font-serif text-lg">{t.name}</span>
                        <span className="ml-auto text-xs" style={{ ...MONO, color: DIM }}>
                          {t.who.map((id) => members.find((m) => m.id === id)?.name).join(', ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {chosen.length === 1 && <Profile m={chosen[0]} />}
              {chosen.length > 1 && (
                <>
                  <h2 className="font-serif text-2xl">{chosen.map((m) => m.name).join(' + ')}</h2>
                  {links.length === 0 ? (
                    <p className="font-serif text-base" style={{ color: '#c9d4dd' }}>
                      No overlap found yet. Ask Claude who could complete this combination.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {links.map((l) => (
                        <li key={`${l.a}-${l.b}-${l.kind}`} className="font-serif text-base">
                          <span style={{ color: l.kind === 'shared' ? '#e8c27a' : '#8fdcff' }}>
                            {l.kind === 'shared' ? 'Both want' : 'Can help with'}
                          </span>{' '}
                          {l.themes.map(themeName).join(', ')}:{' '}
                          {members.find((m) => m.id === l.a)?.name} and{' '}
                          {members.find((m) => m.id === l.b)?.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {answer.state !== 'idle' && (
                <div
                  className="flex flex-col gap-2 rounded-[10px] border p-3"
                  style={{ borderColor: '#e8c27a', background: 'rgba(232,194,122,.06)' }}
                  aria-live="polite"
                >
                  <Label>Claude</Label>
                  {answer.state === 'signin' && (
                    <p className="font-serif text-base">
                      Sign in to ask Claude.{' '}
                      <a href="/login" className="underline" style={{ color: '#e8c27a' }}>
                        Sign in
                      </a>
                    </p>
                  )}
                  {answer.state === 'error' && (
                    <p className="font-serif text-base">{answer.message}</p>
                  )}
                  {(answer.state === 'busy' || answer.state === 'done') &&
                    (answer.text || 'Thinking…').split(/\n\n+/).map((p, i) => (
                      <p key={i} className="font-serif text-base leading-relaxed">
                        {p}
                      </p>
                    ))}
                </div>
              )}
            </div>
            <form
              onSubmit={ask}
              className="flex gap-2 border-t px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"
              style={{ borderColor: LINE }}
            >
              <input
                aria-label="Ask Claude about this combination"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={600}
                placeholder={
                  chosen.length > 1 ? 'What could we make together?' : 'Ask about the group…'
                }
                className="min-w-0 flex-1 rounded-full border bg-transparent px-4 py-2 font-serif text-base"
                style={{ borderColor: LINE, color: INK }}
              />
              <button
                type="submit"
                disabled={answer.state === 'busy'}
                className="rounded-full px-4 text-sm disabled:opacity-50"
                style={{ ...MONO, background: '#e8c27a', color: '#1b1406' }}
              >
                Ask
              </button>
            </form>
          </>
        )}
      </aside>

      {onboarding && (
        <OnboardingSheet
          index={members.length}
          initial={me}
          onDone={join}
          onCancel={() => setOnboarding(false)}
        />
      )}
    </main>
  );
}
