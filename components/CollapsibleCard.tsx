'use client';

import { useState } from 'react';

interface CollapsibleCardProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export default function CollapsibleCard({
  title,
  defaultOpen = false,
  children,
  rightSlot,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-border bg-card/80 px-4 py-3 text-[15px] font-normal tracking-[0.08em] text-center transition-colors hover:bg-card cursor-pointer font-serif"
      >
        {title}
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[15px] font-normal tracking-[0.08em] transition-colors hover:text-muted-foreground cursor-pointer font-serif"
        >
          {title}
        </button>
        {rightSlot && <div className="absolute right-0">{rightSlot}</div>}
      </div>
      {children}
    </div>
  );
}
