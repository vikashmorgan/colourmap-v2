'use client';

import { useState } from 'react';

import { ARCHETYPES, type Member } from '@/lib/collective/model';
import { type Answers, profileFrom, QUESTIONS } from '@/lib/collective/onboarding';

type Props = {
  index: number;
  initial?: Member | null;
  onDone: (me: Member) => void;
  onCancel: () => void;
};

function answersFrom(m: Member | null | undefined): Answers {
  if (!m) return { name: '' };
  return {
    name: m.name,
    archetype: m.archetype,
    style: m.style,
    skills: m.skills.join(', '),
    strengths: m.strengths.join(', '),
    places: m.places.join(', '),
    moments: m.moments.join(', '),
    intentions: m.intentions.join(', '),
  };
}

const MONO = { fontFamily: 'var(--font-cowboy)' };

/** Guided questions, one per screen, that build your profile: your second brain's first page. */
export default function OnboardingSheet({ index, initial, onDone, onCancel }: Props) {
  const [answers, setAnswers] = useState<Answers>(() => answersFrom(initial));
  const [step, setStep] = useState(0); // 0 = name, then one per question
  const q = step > 0 ? QUESTIONS[step - 1] : null;
  const last = step === QUESTIONS.length;
  const canNext = step > 0 || answers.name.trim().length > 0;

  function next() {
    if (!canNext) return;
    if (!last) return setStep(step + 1);
    const me = profileFrom(answers, index);
    if (me) onDone(me);
  }

  const field = q?.field;
  const value = field ? (answers[field] ?? '') : answers.name;
  const set = (v: string) => setAnswers((a) => (field ? { ...a, [field]: v } : { ...a, name: v }));

  return (
    <section
      aria-label="Add yourself"
      className="fixed inset-x-0 bottom-0 z-30 flex max-h-[85svh] flex-col gap-4 overflow-auto rounded-t-[18px] border p-4 pb-[max(16px,env(safe-area-inset-bottom))] md:inset-auto md:top-1/2 md:left-1/2 md:w-[480px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[10px]"
      style={{ background: '#0a1628', borderColor: 'rgba(143,220,255,.3)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-[0.18em]" style={{ ...MONO, color: '#9fb6c7' }}>
          Your profile · {step + 1} of {QUESTIONS.length + 1}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3 py-1 text-sm"
          style={{ ...MONO, color: '#9fb6c7' }}
        >
          Close
        </button>
      </div>
      <h2 className="font-serif text-2xl" style={{ color: '#efe6d2' }}>
        {q ? q.title : 'What should the group call you?'}
      </h2>
      <p className="font-serif text-base" style={{ color: '#b9c6d2' }}>
        {q ? q.hint : 'Your profile stays on this phone until you choose to share it with a group.'}
      </p>
      {field === 'archetype' ? (
        <fieldset className="grid grid-cols-2 gap-2 border-0 p-0" aria-label="Archetype">
          {ARCHETYPES.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={value === a.id}
              onClick={() => set(a.id)}
              className="flex flex-col items-start gap-1 rounded-[10px] border px-3 py-2 text-left"
              style={{
                borderColor: value === a.id ? '#e8c27a' : 'rgba(143,220,255,.25)',
                background: value === a.id ? 'rgba(232,194,122,.12)' : 'transparent',
                color: '#efe6d2',
              }}
            >
              <span className="font-serif text-lg">{a.name}</span>
              <span className="text-xs" style={{ ...MONO, color: '#9fb6c7' }}>
                {a.line}
              </span>
            </button>
          ))}
        </fieldset>
      ) : (
        <textarea
          aria-label={q ? q.title : 'Your name'}
          value={value}
          onChange={(e) => set(e.target.value)}
          rows={step === 0 ? 1 : 3}
          maxLength={step === 0 ? 40 : 600}
          className="w-full resize-none rounded-[10px] border bg-transparent px-3 py-2 font-serif text-base"
          style={{ borderColor: 'rgba(143,220,255,.3)', color: '#efe6d2' }}
        />
      )}
      <div className="flex gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="rounded-full border px-4 py-2 text-sm"
            style={{ ...MONO, borderColor: 'rgba(143,220,255,.3)', color: '#efe6d2' }}
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={next}
          disabled={!canNext}
          className="ml-auto rounded-full px-5 py-2 text-sm disabled:opacity-40"
          style={{ ...MONO, background: '#e8c27a', color: '#1b1406' }}
        >
          {last ? 'Join the map' : 'Next'}
        </button>
      </div>
    </section>
  );
}
