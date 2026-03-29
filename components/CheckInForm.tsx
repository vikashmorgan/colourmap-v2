'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

export default function CheckInForm() {
  const [sliderValue, setSliderValue] = useState(50);
  const [hasMoved, setHasMoved] = useState(false);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

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
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? 'Something went wrong');
        return;
      }

      setSliderValue(50);
      setHasMoved(false);
      setNote('');
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
    } catch {
      setError('Network error — check your connection');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-border bg-card p-6 space-y-6"
    >
      <div className="space-y-3">
        <Label htmlFor="check-in-slider">How are you feeling?</Label>
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
      {isSuccess && <p className="text-sm text-muted-foreground">Checked in.</p>}

      <Button type="submit" disabled={!hasMoved || isSubmitting} className="w-full">
        {isSubmitting ? 'Saving...' : 'Check in'}
      </Button>
    </form>
  );
}
