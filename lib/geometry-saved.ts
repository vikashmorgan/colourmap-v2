/*
 * SAVED LOOKS for the Geometry Builder (2026-10-26).
 *
 * Martin: "add ability to save presets for the geometry sliders oil fractal.
 * here is the first saved one" (Rorschach: Flow 0.25, Mirrors 10, Detail 8,
 * Spread 9.5, Rainbow 1.5, Light 6, Bloom 0.3).
 *
 * A look is a mode, its slider values, and the oil colours when chosen. They
 * are kept in this browser; the first one is built in, so it is there on every
 * device. Saving names a look after its mode ("Rorschach 2").
 *
 * Pure apart from the two storage helpers at the end, which never throw.
 */

export type LookValues = {
  symmetry: number;
  complexity: number;
  glow: number;
  breathSpeed: number;
  intensity: number;
  particles: number;
  luminous: number;
  stars: number;
};

export type SavedLook = {
  id: string;
  name: string;
  mode: string;
  values: LookValues;
  /** The four oil colours, when chosen; left out, the current colours stay. */
  oilColors?: string[];
  /** The colour palette's name, when it should come along. */
  preset?: string;
  /** For a Liquid Butterflies look: which piece. */
  butterfly?: string;
  /** Built in: on every device, and cannot be deleted. */
  builtIn?: boolean;
};

export const SAVED_KEY = 'colourmap:geometry-saved-looks';

export const VALUE_KEYS: (keyof LookValues)[] = [
  'symmetry',
  'complexity',
  'glow',
  'breathSpeed',
  'intensity',
  'particles',
  'luminous',
  'stars',
];

export const BUILT_IN_LOOKS: SavedLook[] = [
  {
    id: 'oil-fractal-1',
    name: 'Oil Fractal 1',
    mode: 'rorschach',
    values: {
      breathSpeed: 0.25,
      symmetry: 10,
      complexity: 8,
      particles: 9.5,
      glow: 1.5,
      intensity: 6,
      luminous: 0.3,
      stars: 0,
    },
    builtIn: true,
  },
];

const HEX = /^#[0-9a-f]{6}$/i;

function parseLook(raw: unknown): SavedLook | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string' || typeof r.mode !== 'string')
    return null;
  const v = (r.values ?? {}) as Record<string, unknown>;
  const values = {} as LookValues;
  for (const k of VALUE_KEYS) {
    const n = v[k];
    if (typeof n !== 'number' || !Number.isFinite(n)) return null;
    values[k] = n;
  }
  const look: SavedLook = { id: r.id, name: r.name.slice(0, 60), mode: r.mode, values };
  if (
    Array.isArray(r.oilColors) &&
    r.oilColors.length === 4 &&
    r.oilColors.every((c) => typeof c === 'string' && HEX.test(c))
  ) {
    look.oilColors = r.oilColors as string[];
  }
  if (typeof r.preset === 'string') look.preset = r.preset;
  if (typeof r.butterfly === 'string') look.butterfly = r.butterfly;
  return look;
}

/** The looks saved in this browser, junk dropped. */
export function parseSaved(raw: string | null): SavedLook[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list.map(parseLook).filter((l): l is SavedLook => l !== null);
  } catch {
    return [];
  }
}

/** Built-in looks first, then the saved ones. */
export const allLooks = (saved: SavedLook[]): SavedLook[] => [...BUILT_IN_LOOKS, ...saved];

/** "Rorschach 2": the mode's name and the next free number among looks of that name. */
export function nextName(base: string, looks: SavedLook[]): string {
  const taken = new Set(looks.map((l) => l.name));
  let n = 1;
  while (taken.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

/** A new look from the current settings. */
export function makeLook(
  input: {
    mode: string;
    values: LookValues;
    oilColors?: string[];
    preset?: string;
    butterfly?: string;
  },
  base: string,
  looks: SavedLook[],
  now: number,
): SavedLook {
  const look: SavedLook = {
    id: `look-${now.toString(36)}`,
    name: nextName(base, looks),
    mode: input.mode,
    values: { ...input.values },
  };
  if (input.oilColors) look.oilColors = [...input.oilColors];
  if (input.preset) look.preset = input.preset;
  if (input.butterfly) look.butterfly = input.butterfly;
  return look;
}

/** Saved looks without the one with this id; built-in ones cannot be removed. */
export const removeLook = (saved: SavedLook[], id: string): SavedLook[] =>
  saved.filter((l) => l.id !== id);

export function readSaved(): SavedLook[] {
  try {
    return parseSaved(window.localStorage.getItem(SAVED_KEY));
  } catch {
    return [];
  }
}

export function writeSaved(saved: SavedLook[]): void {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  } catch {
    // Storage blocked: the look stays for this visit only.
  }
}
