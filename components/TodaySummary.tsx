'use client';

import { useCompletion } from '@ai-sdk/react';
import { useEffect, useState } from 'react';

import { getEmotionalWord } from '@/lib/emotional-vocabulary';

interface CheckIn {
  id: string;
  sliderValue: number;
  emotionColor: string | null;
  emotionName: string | null;
  note: string | null;
  tags: string[] | null;
  createdAt: string;
}

function hasContent(ci: CheckIn): boolean {
  if (ci.note?.trim()) return true;
  if (ci.tags && ci.tags.length > 0) return true;
  if (ci.emotionName) return true;
  if (ci.sliderValue !== 50) return true;
  return false;
}

function getDotColor(value: number): string {
  if (value <= 25) return 'hsl(220 15% 55%)';
  if (value <= 62) return 'hsl(40 15% 55%)';
  return 'hsl(25 70% 55%)';
}

export default function TodaySummary({ refreshKey }: { refreshKey: number }) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  useEffect(() => {
    fetch('/api/check-ins')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CheckIn[]) => {
        const today = new Date().toDateString();
        setCheckIns(data.filter((ci) => new Date(ci.createdAt).toDateString() === today && hasContent(ci)));
      });
  }, [refreshKey]);

  const { completion, complete, isLoading } = useCompletion({
    api: '/api/check-ins/analysis',
  });

  const [synthesisFetched, setSynthesisFetched] = useState(false);

  useEffect(() => {
    if (checkIns.length >= 2 && !synthesisFetched) {
      setSynthesisFetched(true);
      complete('');
    }
  }, [checkIns.length, synthesisFetched, complete]);

  if (checkIns.length === 0) return null;

  const dominantWord = getEmotionalWord(
    Math.round(checkIns.reduce((sum, ci) => sum + ci.sliderValue, 0) / checkIns.length),
  );

  return (
    <div className="rounded-2xl border border-border bg-card/60 px-4 py-3 space-y-2">
      <p className="text-[10px] text-muted-foreground/50">
        Today — {checkIns.length} check-in{checkIns.length > 1 ? 's' : ''}, mostly {dominantWord}
      </p>

      {/* AI synthesis */}
      {(completion || isLoading) && (
        <div className="pt-1">
          {isLoading && !completion && (
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1 w-1 rounded-full animate-pulse"
                  style={{ background: '#C4A060', opacity: 0.3, animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
          )}
          {completion && (
            <p className="text-[11px] leading-relaxed text-muted-foreground/60">{completion}</p>
          )}
        </div>
      )}
    </div>
  );
}
