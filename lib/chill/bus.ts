/**
 * Chill bus — sound events the Chill Machine broadcasts so the visuals can
 * answer them (echoes). Anything that makes a sound emits; the visualizer
 * subscribes. Spec: docs/specs/chill-machine-public.md → Echo.
 */

export type ChillEventKind = 'note' | 'pad' | 'kick' | 'peak';

export type ChillEvent = {
  kind: ChillEventKind;
  /** 0–1 left → right. Pads: grid column; notes: random-ish spread. */
  x: number;
  /** 0–1 top → bottom. Notes: high pitch → top. */
  y: number;
  /** 0–1 how hard the hit was. */
  strength: number;
  /** Hex colour of the pad / palette slot that made it. */
  color?: string;
};

type Listener = (event: ChillEvent) => void;

const listeners = new Set<Listener>();

export function emitChill(event: ChillEvent): void {
  for (const l of listeners) l(event);
}

/** Subscribe to Chill events; returns the unsubscribe function. */
export function onChill(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Map a frequency (Hz) to y (0 top, 1 bottom) across ~55 Hz – 1.76 kHz. */
export function pitchToY(freq: number): number {
  if (!(freq > 0)) return 0.5;
  const octaves = Math.log2(freq / 55);
  return Math.min(1, Math.max(0, 1 - octaves / 5));
}
