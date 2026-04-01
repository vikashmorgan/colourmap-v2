'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { getEmotionalWord } from '@/lib/emotional-vocabulary';

import ReflectionMoment from './ReflectionMoment';

const TAGS = ['Work', 'Body', 'Relationships', 'Creative', 'General'] as const;

interface MissionSummary {
  id: string;
  title: string;
}

interface CheckInFormProps {
  missions?: MissionSummary[];
  onCheckInComplete?: () => void;
}

export default function CheckInForm({ missions = [], onCheckInComplete }: CheckInFormProps) {
  const [sliderValue, setSliderValue] = useState(50);
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflectionWord, setReflectionWord] = useState<string | null>(null);

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
          missionId: selectedMission,
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
    setNote('');
    setSelectedTags(new Set());
    setSelectedMission(null);
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
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-center">Check In</p>

      <div className="space-y-3">
        <Label htmlFor="check-in-slider">How are you feeling?</Label>

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
          }}
        />
      </div>

      {/* Mission selector */}
      {missions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {missions.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={selectedMission === m.id}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedMission === m.id
                  ? 'bg-[#5C3018] text-[#F5DEB8]'
                  : 'border border-border bg-card text-muted-foreground hover:bg-accent'
              }`}
              onClick={() => setSelectedMission(selectedMission === m.id ? null : m.id)}
            >
              {m.title.length > 20 ? `${m.title.slice(0, 20)}...` : m.title}
            </button>
          ))}
        </div>
      )}

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

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#5C3018] text-[#F5DEB8] hover:bg-[#4A2810]"
      >
        {isSubmitting ? 'Saving...' : 'Check in'}
      </Button>
    </form>
  );
}
