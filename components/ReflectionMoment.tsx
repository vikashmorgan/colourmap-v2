'use client';

import { useCallback, useEffect, useState } from 'react';

interface ReflectionMomentProps {
  word: string;
  onDismiss: () => void;
}

export default function ReflectionMoment({ word, onDismiss }: ReflectionMomentProps) {
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onDismiss, 400);
  }, [onDismiss]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(dismiss, 6000);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
    };
  }, [dismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`You're feeling ${word}. Take one breath.`}
      className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card p-12 text-center cursor-pointer transition-opacity duration-400"
      style={{ opacity: visible ? 1 : 0 }}
      onClick={dismiss}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') dismiss();
      }}
    >
      <p className="text-4xl font-semibold tracking-tight">{word}</p>
      <p className="text-sm text-muted-foreground">Take one breath.</p>
    </div>
  );
}
