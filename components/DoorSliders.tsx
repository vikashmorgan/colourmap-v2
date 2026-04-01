'use client';

import { Slider } from '@/components/ui/slider';
import type { Door } from '@/lib/life-scan-config';

interface DoorSlidersProps {
  door: Door;
  values: Record<string, number>;
  onChange: (id: string, value: number) => void;
}

export default function DoorSliders({ door, values, onChange }: DoorSlidersProps) {
  return (
    <div className="space-y-6">
      <p
        className="text-sm font-semibold uppercase tracking-[0.24em] text-center"
        style={{ color: door.color }}
      >
        {door.name}
      </p>

      {door.sliders.map((s) => (
        <div key={s.id} className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{s.left}</span>
            <span>{s.right}</span>
          </div>
          <Slider
            value={[values[s.id] ?? 4]}
            min={0}
            max={8}
            step={1}
            onValueChange={(v) => {
              const val = Array.isArray(v) ? v[0] : v;
              onChange(s.id, val);
            }}
          />
        </div>
      ))}
    </div>
  );
}
