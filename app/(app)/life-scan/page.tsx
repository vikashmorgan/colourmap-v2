'use client';

import { useCallback, useState } from 'react';

import DoorSliders from '@/components/DoorSliders';
import ScanQuestions from '@/components/ScanQuestions';
import ScanSuggestions from '@/components/ScanSuggestions';
import {
  DOOR_QUESTIONS,
  DOORS,
  getSuggestions,
  type SectionSuggestion,
  UNIVERSAL_QUESTIONS,
} from '@/lib/life-scan-config';

type Step = 'door-0' | 'door-1' | 'door-2' | 'questions' | 'program';

function stepIndex(step: Step): number {
  if (step.startsWith('door-')) return Number(step.split('-')[1]);
  if (step === 'questions') return 3;
  return 4;
}

export default function LifeScanPage() {
  const [step, setStep] = useState<Step>('door-0');
  const [doorValues, setDoorValues] = useState<Record<string, Record<string, number>>>({
    feeling: { energy: 4, relaxation: 4, emotions: 4, presence: 4 },
    doing: { focus: 4, motivation: 4, creative: 4, discipline: 4 },
    sharing: { connected: 4, honest: 4, giving: 4, belonging: 4 },
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [suggestions, setSuggestions] = useState<SectionSuggestion[]>([]);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());

  const currentDoorIndex = step.startsWith('door-') ? Number(step.split('-')[1]) : -1;
  const currentDoor = currentDoorIndex >= 0 ? DOORS[currentDoorIndex] : null;
  const currentStepNum = stepIndex(step) + 1;

  function handleSliderChange(doorId: string, sliderId: string, value: number) {
    setDoorValues((prev) => ({
      ...prev,
      [doorId]: { ...prev[doorId], [sliderId]: value },
    }));
  }

  function getQuestions(): string[] {
    const questions = [...UNIVERSAL_QUESTIONS];
    for (const door of DOORS) {
      const avg =
        Object.values(doorValues[door.id] ?? {}).reduce((a, b) => a + b, 0) /
        (Object.values(doorValues[door.id] ?? {}).length || 1);
      if (avg < 4 && DOOR_QUESTIONS[door.id]) {
        questions.push(...DOOR_QUESTIONS[door.id]);
      }
    }
    return questions;
  }

  function next() {
    if (step === 'door-0') setStep('door-1');
    else if (step === 'door-1') setStep('door-2');
    else if (step === 'door-2') setStep('questions');
    else if (step === 'questions') {
      const doorScores: Record<string, number> = {};
      for (const door of DOORS) {
        const vals = Object.values(doorValues[door.id] ?? {});
        doorScores[door.id] = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
      }
      setSuggestions(getSuggestions(doorScores));
      handleSave();
      setStep('program');
    }
  }

  function prev() {
    if (step === 'door-1') setStep('door-0');
    else if (step === 'door-2') setStep('door-1');
    else if (step === 'questions') setStep('door-2');
    else if (step === 'program') setStep('questions');
  }

  async function handleSave() {
    setSaving(true);
    try {
      const scanGroup = crypto.randomUUID();
      await fetch('/api/life-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanGroup,
          doors: DOORS.map((d) => ({ door: d.id, sliders: doorValues[d.id] })),
          reflections: Object.entries(answers)
            .filter(([, a]) => a.trim())
            .map(([q, a]) => ({ question: q, answer: a })),
        }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const handleAccept = useCallback(async (suggestion: SectionSuggestion, index: number) => {
    setAccepted((prev) => new Set([...prev, index]));
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: suggestion.name,
          trackers: suggestion.trackers,
        }),
      });
      if (!res.ok) {
        setAccepted((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }
    } catch {
      setAccepted((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }, []);

  return (
    <main className="mx-auto max-w-lg space-y-8">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={`step-${i}`}
            className={`h-1.5 rounded-full transition-all ${
              i < currentStepNum ? 'w-8 bg-[#5C3018]' : 'w-4 bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Door sliders */}
      {currentDoor && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <DoorSliders
            door={currentDoor}
            values={doorValues[currentDoor.id] ?? {}}
            onChange={(id, val) => handleSliderChange(currentDoor.id, id, val)}
          />
        </div>
      )}

      {/* Questions */}
      {step === 'questions' && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <ScanQuestions
            questions={getQuestions()}
            answers={answers}
            onChange={(q, a) => setAnswers((prev) => ({ ...prev, [q]: a }))}
          />
        </div>
      )}

      {/* Program suggestions */}
      {step === 'program' && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <ScanSuggestions
            suggestions={suggestions}
            onAccept={(s) => {
              const idx = suggestions.indexOf(s);
              handleAccept(s, idx);
            }}
            onDismiss={(i) => {
              setSuggestions((prev) => prev.filter((_, j) => j !== i));
            }}
            accepted={accepted}
          />
          {saved && <p className="mt-4 text-xs text-muted-foreground text-center">Scan saved.</p>}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={prev}
          className={`rounded-xl px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground ${
            step === 'door-0' ? 'invisible' : ''
          }`}
        >
          Back
        </button>
        {step !== 'program' && (
          <button
            type="button"
            onClick={next}
            disabled={saving}
            className="rounded-xl bg-[#5C3018] px-6 py-2 text-sm font-medium text-[#F5DEB8] transition-colors hover:bg-[#4A2810]"
          >
            {step === 'questions' ? (saving ? 'Saving...' : 'Finish') : 'Next'}
          </button>
        )}
      </div>
    </main>
  );
}
