'use client';

import { useCompletion } from '@ai-sdk/react';
import { useEffect } from 'react';

interface Props {
  checkInId: string;
  emotionColor: string;
  onDismiss: () => void;
}

export default function PostCheckInInsight({ checkInId, emotionColor, onDismiss }: Props) {
  const { completion, complete, isLoading } = useCompletion({
    api: '/api/check-ins/insight',
  });

  useEffect(() => {
    complete('', { body: { checkInId } });
  }, [checkInId, complete]);

  useEffect(() => {
    if (!isLoading && completion) {
      const timer = setTimeout(onDismiss, 12000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, completion, onDismiss]);

  if (!completion && !isLoading) return null;

  return (
    <div
      className="rounded-xl px-4 py-3 animate-in fade-in duration-500 cursor-pointer"
      style={{ background: `${emotionColor}08`, borderLeft: `3px solid ${emotionColor}30` }}
      onClick={onDismiss}
    >
      {isLoading && !completion && (
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: emotionColor, opacity: 0.3, animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      )}
      {completion && (
        <p className="text-sm leading-relaxed" style={{ color: `${emotionColor}cc` }}>
          {completion}
        </p>
      )}
    </div>
  );
}
