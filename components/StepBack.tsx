'use client';

import { useCallback, useEffect, useState } from 'react';

export default function StepBack() {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [count, setCount] = useState(0);

  const close = useCallback(() => {
    setActive(false);
    setCount(0);
    setPhase('in');
  }, []);

  useEffect(() => {
    if (!active) return;
    // Breathing cycle: 4s in, 4s hold, 4s out
    const durations = { in: 4000, hold: 4000, out: 4000 };
    const timer = setTimeout(() => {
      if (phase === 'in') setPhase('hold');
      else if (phase === 'hold') setPhase('out');
      else {
        setCount((c) => c + 1);
        setPhase('in');
      }
    }, durations[phase]);
    return () => clearTimeout(timer);
  }, [active, phase]);

  // Auto-close after 3 cycles
  useEffect(() => {
    if (count >= 3) close();
  }, [count, close]);

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className="h-2 w-2 rounded-full transition-all hover:scale-150"
        style={{ background: '#C4A060', opacity: 0.3 }}
        title="Step back"
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
      style={{ background: '#1a1108ee', backdropFilter: 'blur(8px)' }}
      onClick={close}
    >
      <div className="flex flex-col items-center gap-8">
        {/* Breathing circle */}
        <div
          className="rounded-full transition-all"
          style={{
            width: phase === 'in' ? 120 : phase === 'hold' ? 120 : 60,
            height: phase === 'in' ? 120 : phase === 'hold' ? 120 : 60,
            background: '#C4A06015',
            border: '1px solid #C4A06030',
            transitionDuration: phase === 'in' ? '4s' : phase === 'hold' ? '0.3s' : '4s',
            transitionTimingFunction: 'ease-in-out',
          }}
        />

        {/* Phase word */}
        <p
          className="text-lg font-normal tracking-[0.15em] transition-opacity duration-1000 font-serif"
          style={{ color: '#C4A06080' }}
        >
          {phase === 'in' ? 'Breathe in' : phase === 'hold' ? 'Hold' : 'Let go'}
        </p>

        {/* Cycle dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: '#C4A060', opacity: i < count ? 0.6 : 0.15 }}
            />
          ))}
        </div>

        <p className="text-[10px] text-[#C4A06040] mt-4">tap anywhere to return</p>
      </div>
    </div>
  );
}
