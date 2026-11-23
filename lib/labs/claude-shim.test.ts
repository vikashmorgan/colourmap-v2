import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SHIM = readFileSync(path.join(process.cwd(), 'public/labs/claude-shim.js'), 'utf8');

type Snap = { exists: boolean; data: () => unknown };
type Doc = {
  get: () => Promise<Snap>;
  set: (v: unknown) => Promise<void>;
  update: (v: Record<string, unknown>) => Promise<void>;
  onSnapshot: (cb: (s: Snap) => void) => () => void;
};
type Runtime = { use: (name: string) => Promise<{ doc: (p: string) => Doc } | null> };

function boot(): Runtime {
  delete (window as { claude?: unknown }).claude;
  new Function(SHIM)();
  return (window as unknown as { claude: Runtime }).claude;
}

describe('labs claude shim', () => {
  beforeEach(() => localStorage.clear());

  it('gives null for capabilities it does not provide', async () => {
    const claude = boot();
    expect(await claude.use('sample')).toBeNull();
    expect(await claude.use('dictation')).toBeNull();
  });

  it('stores documents on the device and reads them back', async () => {
    const db = await boot().use('db');
    const doc = db!.doc('marks/main');
    expect((await doc.get()).exists).toBe(false);
    await doc.set({ a: 1 });
    const snap = await doc.get();
    expect(snap.exists).toBe(true);
    expect(snap.data()).toEqual({ a: 1 });
  });

  it('merges updates into the stored document', async () => {
    const db = await boot().use('db');
    const doc = db!.doc('state/main');
    await doc.set({ a: 1 });
    await doc.update({ b: 2 });
    expect((await doc.get()).data()).toEqual({ a: 1, b: 2 });
  });

  it('notifies snapshot listeners now and on every write, until unsubscribed', async () => {
    const db = await boot().use('db');
    const doc = db!.doc('state/main');
    const seen = vi.fn();
    const stop = doc.onSnapshot(seen);
    expect(seen).toHaveBeenLastCalledWith(expect.objectContaining({ exists: false }));
    await doc.set({ x: true });
    expect(seen).toHaveBeenCalledTimes(2);
    stop();
    await doc.set({ x: false });
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it('treats unreadable stored data as missing', async () => {
    const db = await boot().use('db');
    localStorage.setItem('labs-db:/:broken', '{nope');
    expect((await db!.doc('broken').get()).exists).toBe(false);
  });

  it('leaves an existing runtime alone', () => {
    const real = { use: vi.fn() };
    (window as unknown as { claude: unknown }).claude = real;
    new Function(SHIM)();
    expect((window as unknown as { claude: unknown }).claude).toBe(real);
  });
});
