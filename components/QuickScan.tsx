'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const DOTS = [
  { id: 'blocks', color: '#D4605A', label: 'Blocks' },
  { id: 'flow', color: '#4AB87A', label: 'Flow' },
  { id: 'vision', color: '#C4A060', label: 'Vision' },
];

export default function QuickScan() {
  const [answers, setAnswers] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    fetch('/api/life-scan-answers')
      .then((res) => res.json())
      .then((data) => {
        if (data.answers && typeof data.answers === 'object') {
          setAnswers(data.answers);
        } else {
          setAnswers({});
        }
      })
      .catch(() => setAnswers({}));
  }, []);

  const fears = (answers?.block_fears_list || '').split('|||').filter(Boolean);
  const strengths = (answers?.flow_strengths_list || '').split('|||').filter(Boolean);
  const visionFilled = !!(answers?.vision_where || '').trim();
  const hasData = fears.length > 0 || strengths.length > 0 || visionFilled;

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-10">
        {DOTS.map((dot) => {
          let count = 0;
          let subtitle = '';
          if (dot.id === 'blocks') {
            count = fears.length;
            subtitle = count > 0 ? `${count} fear${count !== 1 ? 's' : ''}` : 'none yet';
          } else if (dot.id === 'flow') {
            count = strengths.length;
            subtitle = count > 0 ? `${count} strength${count !== 1 ? 's' : ''}` : 'none yet';
          } else if (dot.id === 'vision') {
            subtitle = visionFilled ? 'filled' : 'not set';
          }

          return (
            <div key={dot.id} className="flex flex-col items-center gap-1.5">
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: dot.color,
                  opacity:
                    (dot.id === 'blocks' && fears.length > 0) ||
                    (dot.id === 'flow' && strengths.length > 0) ||
                    (dot.id === 'vision' && visionFilled)
                      ? 0.7
                      : 0.3,
                }}
              >
                {dot.id === 'blocks' && fears.length > 0 && (
                  <span className="text-white text-xs font-bold">{fears.length}</span>
                )}
                {dot.id === 'flow' && strengths.length > 0 && (
                  <span className="text-white text-xs font-bold">{strengths.length}</span>
                )}
                {dot.id === 'vision' && visionFilled && (
                  <span className="text-white text-xs font-bold">&#10003;</span>
                )}
              </div>
              <span
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: `${dot.color}80` }}
              >
                {dot.label}
              </span>
              <span className="text-[9px] text-muted-foreground">{subtitle}</span>
            </div>
          );
        })}
      </div>

      {!hasData && answers !== null && (
        <div className="text-center">
          <Link
            href="/life-scan"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Start your Life Scan
          </Link>
        </div>
      )}
    </div>
  );
}
