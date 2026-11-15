'use client';

/*
 * The police after you, felt at the screen's edges (docs/specs/art-city.md, "The space police
 * chase you, and the bounties", 2026-11-15): a soft red glow on one side and blue on the other,
 * swapping with the cruisers' flares, fading as you hide. No count, no badge: the one cue.
 */

import { useEffect, useRef } from 'react';
import { policeLight } from '@/lib/city';

export default function CityPoliceGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const frame = () => {
      const el = ref.current;
      if (el) {
        const { k, redLeft } = policeLight();
        const shown = k < 0.01 ? '0' : (0.42 * k).toFixed(2);
        if (el.style.opacity !== shown) el.style.opacity = shown;
        const side = redLeft ? 'left' : 'right';
        if (el.dataset.red !== side) el.dataset.red = side;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div ref={ref} className="cd-police" aria-hidden="true" style={{ opacity: 0 }}>
      <span className="cd-police-edge cd-police-l" />
      <span className="cd-police-edge cd-police-r" />
    </div>
  );
}
