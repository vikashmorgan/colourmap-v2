import type { Metadata } from 'next';
import Link from 'next/link';

import { LABS } from '@/lib/labs/registry';

export const metadata: Metadata = {
  title: { absolute: 'Labs · Colour Brain' },
  description: 'Prototypes for a collective second brain: wheels, bubbles, maps and cities.',
};

export default function LabsPage() {
  return (
    <main className="min-h-svh px-4 py-12" style={{ background: '#0b0a12', color: '#efe6d2' }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p
            className="text-xs uppercase tracking-[0.2em]"
            style={{ fontFamily: 'var(--font-cowboy)', color: '#a39a88' }}
          >
            Colour Brain · Labs
          </p>
          <h1 className="font-serif text-3xl" style={{ color: '#e8c27a' }}>
            Prototypes
          </h1>
          <p className="max-w-[65ch] font-serif text-base" style={{ color: '#cfc6b2' }}>
            Living sketches of a second brain that people and groups can play with. Each one opens
            full screen and keeps what you change on this device.
          </p>
        </header>
        <ul className="grid gap-4 sm:grid-cols-2">
          {LABS.map((lab) => (
            <li key={lab.slug}>
              <Link
                href={`/labs/${lab.slug}`}
                className="flex h-full flex-col gap-2 rounded-[10px] border p-4 transition-colors hover:border-[#e8c27a]"
                style={{ borderColor: 'rgba(232,194,122,.28)', background: 'rgba(17,16,30,.7)' }}
              >
                <span className="font-serif text-xl">{lab.title}</span>
                <span className="font-serif text-sm" style={{ color: '#a39a88' }}>
                  {lab.line}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
