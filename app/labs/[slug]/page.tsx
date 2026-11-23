import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { findLab, LABS, labSrc } from '@/lib/labs/registry';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return LABS.map((lab) => ({ slug: lab.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lab = findLab((await params).slug);
  return lab ? { title: { absolute: lab.title }, description: lab.line } : {};
}

export default async function LabPage({ params }: Props) {
  const lab = findLab((await params).slug);
  if (!lab) notFound();
  return (
    <main className="fixed inset-0" style={{ background: '#05060d' }}>
      <iframe
        src={labSrc(lab)}
        title={lab.title}
        className="block h-full w-full border-0"
        allow="microphone; clipboard-write; fullscreen"
      />
    </main>
  );
}
