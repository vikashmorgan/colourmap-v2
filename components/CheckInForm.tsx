'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { getEmotionalWord } from '@/lib/emotional-vocabulary';
import { getTimeOfDay } from '@/lib/time-of-day';

import ReflectionMoment from './ReflectionMoment';

const TAGS = ['Work', 'Body', 'Relationships', 'Creative', 'General'] as const;

interface CheckInFormProps {
  onCheckInComplete?: () => void;
}

export default function CheckInForm({ onCheckInComplete }: CheckInFormProps) {
  const [sliderValue, setSliderValue] = useState(50);
  const [hasMoved, setHasMoved] = useState(false);
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflectionWord, setReflectionWord] = useState<string | null>(null);

  const [greeting, setGreeting] = useState('');
  const [sliderLabel, setSliderLabel] = useState('How are you feeling?');

  useEffect(() => {
    const tod = getTimeOfDay(new Date().getHours());
    setGreeting(tod.greeting);
    setSliderLabel(tod.label);
  }, []);

  const emotionalWord = getEmotionalWord(sliderValue);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/check-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sliderValue,
          note: note.trim() || null,
          tags: selectedTags.size > 0 ? [...selectedTags] : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? 'Something went wrong');
        return;
      }

      const submittedWord = getEmotionalWord(sliderValue);
      setReflectionWord(submittedWord);
    } catch {
      setError('Network error — check your connection');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReflectionDismiss() {
    setReflectionWord(null);
    setSliderValue(50);
    setHasMoved(false);
    setNote('');
    setSelectedTags(new Set());
    onCheckInComplete?.();
  }

  if (reflectionWord) {
    return <ReflectionMoment word={reflectionWord} onDismiss={handleReflectionDismiss} />;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-border bg-card p-6 space-y-6"
    >
      <div className="space-y-3">
        {greeting && <p className="text-sm text-muted-foreground">{greeting}</p>}
        <Label htmlFor="check-in-slider">{sliderLabel}</Label>

        <p
          className="text-3xl font-semibold tracking-tight text-center transition-opacity duration-300"
          aria-live="polite"
        >
          {emotionalWord}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Heavy / Contracted</span>
          <span>Light / Expansive</span>
        </div>
        <Slider
          id="check-in-slider"
          value={[sliderValue]}
          min={0}
          max={100}
          step={1}
          onValueChange={(value) => {
            const v = Array.isArray(value) ? value[0] : value;
            setSliderValue(v);
            if (!hasMoved) setHasMoved(true);
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            aria-pressed={selectedTags.has(tag)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors min-h-[44px] ${
              selectedTags.has(tag)
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:bg-accent'
            }`}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <Label htmlFor="check-in-note">Note (optional)</Label>
        <Textarea
          id="check-in-note"
          placeholder="What's on your mind?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={!hasMoved || isSubmitting} className="w-full">
        {isSubmitting ? 'Saving...' : 'Check in'}
      </Button>
    </form>
  );
}
