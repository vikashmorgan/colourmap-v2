'use client';

import { useEffect, useState } from 'react';

const SIZES = [120, 160, 200, 240, 60];
const STORAGE_KEY = 'colourmap:cat-size';

export default function CockpitCat() {
  const [size, setSize] = useState(200);
  const [showResize, setShowResize] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setSize(Number.parseInt(saved, 10));
  }, []);

  function cycleSize() {
    const idx = SIZES.indexOf(size);
    const next = SIZES[(idx + 1) % SIZES.length];
    setSize(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  return (
    <div className="flex justify-center py-2">
      <div className="relative">
        <img
          src="/cat.png"
          alt=""
          className="cursor-pointer transition-all duration-300"
          style={{ width: size, height: size, objectFit: 'contain' }}
          onClick={() => setShowResize(!showResize)}
        />
        {showResize && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 animate-in fade-in duration-150">
            {SIZES.slice(0, -1).map((s) => (
              <button key={s} type="button" onClick={() => { setSize(s); localStorage.setItem(STORAGE_KEY, String(s)); setShowResize(false); }}
                className="h-5 w-5 rounded-full flex items-center justify-center text-[8px] transition-all"
                style={{
                  background: size === s ? '#C4A06030' : '#C4A06010',
                  color: size === s ? '#5C3018' : '#5C301840',
                  border: size === s ? '1.5px solid #C4A060' : '1.5px solid #C4A06020',
                }}>
                {s === 60 ? 'S' : s === 120 ? 'M' : s === 160 ? 'L' : 'XL'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
