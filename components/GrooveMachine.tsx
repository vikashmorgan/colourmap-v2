'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  setCurrentVoiceTweaks,
  triggerArp,
  triggerBass,
  triggerChop,
  triggerClap,
  triggerGuitar,
  triggerHihat,
  triggerKick,
  triggerLead,
  triggerPad,
  triggerPerc,
  triggerPluck,
  triggerRhodes,
  triggerRiser,
  triggerSnare,
  triggerSubPulse,
  triggerWobble,
} from '@/lib/drum-voices';
import {
  DEFAULT_PRESET_ID,
  GROOVE_PRESETS,
  type GroovePreset,
  getPhaseForBar,
  getPreset,
  PRESET_LS_KEY,
  type PresetVoiceTweaks,
  pickVariationIndex,
} from '@/lib/groove-presets';
import { useSoundSession } from '@/lib/sound-session';

/* ═══════════════════════════════════════════════════════════
   GROOVE MACHINE — collective-ready groove box.
   References: Jamiroquai · Kalkbrenner · The Blaze · Lenny
   Kravitz · Nicolas Jaar. Mix of tech/electro, tropical house,
   rock with a real feel, and deliberate simplicity.
   Silences / breakdowns are first-class (dedicated buttons).
   State is Record<trackId, boolean> — trivial to sync across
   phones in a shared session later.
   ═══════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────
// Tracks
// ─────────────────────────────────────────────────────────────

type TrackId =
  | 'kick'
  | 'snare'
  | 'clap'
  | 'hihat'
  | 'perc'
  | 'bass'
  | 'subpulse'
  | 'wobble'
  | 'rhodes'
  | 'guitar'
  | 'pluck'
  | 'arp'
  | 'lead'
  | 'pad'
  | 'chop';

type Group = 'drums' | 'bass' | 'keys' | 'lead' | 'pads';

interface Track {
  id: TrackId;
  label: string;
  group: Group;
  color: string;
  // 16th-note pattern across 1 bar (16 steps). 0 = silent, 1 = hit,
  // 0.6 = accent-ish (ghost). For pitched tracks, see NOTE_LINES.
  pattern: number[];
  // Optional pitch cycle for melodic tracks (A minor pentatonic root 110 Hz)
  notes?: number[];
}

// A minor pentatonic + natural minor hybrid. Root = A2 (110 Hz).
// Frequencies in Hz. The bass line follows a Jamiroquai-flavoured
// 16th-note funk shape: lots of ghost notes, the root on the 1, the
// minor 7th on the offbeat push.
const A2 = 110;
const C3 = 130.81;
const D3 = 146.83;
const E3 = 164.81;
const G3 = 196;
const A3 = 220;
const C4 = 261.63;
const E4 = 329.63;
const G4 = 392;
const A4 = 440;

const TRACKS: Track[] = [
  // DRUMS — ghost notes, Nujabes-flavoured syncopation, not boring
  {
    id: 'kick',
    label: 'Kick',
    group: 'drums',
    color: '#D4805A',
    // Hip-hop / half-time flavour: 1 and 3 heavy, ghost on the &a of 3
    pattern: [1, 0, 0, 0, 0, 0, 0.5, 0, 1, 0, 0, 0, 0, 0, 0.4, 0],
  },
  {
    id: 'snare',
    label: 'Snare',
    group: 'drums',
    color: '#C44E2A',
    // Backbeat on 2 & 4, ghost on the 13.5 for life
    pattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0.35, 0],
  },
  {
    id: 'clap',
    label: 'Clap',
    group: 'drums',
    color: '#E08858',
    // Layered clap on 2 & 4 for big sound; opt-in
    pattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  },
  {
    id: 'hihat',
    label: 'Hi-hat',
    group: 'drums',
    color: '#C4A060',
    // Swung 16ths with occasional open (velocity 1.0 ≈ open)
    pattern: [0.45, 0.3, 0.7, 0.3, 0.45, 0.3, 1, 0.3, 0.45, 0.3, 0.7, 0.3, 0.45, 0.3, 1, 0.5],
  },
  {
    id: 'perc',
    label: 'Perc',
    group: 'drums',
    color: '#8A6A4A',
    // Clave / shaker cross-rhythm — gives a Latin tech-house ride
    pattern: [0, 0, 0, 1, 0.4, 0, 1, 0, 0, 0, 1, 0, 0.4, 0, 1, 0],
  },
  // BASS
  {
    id: 'bass',
    label: 'Funk Bass',
    group: 'bass',
    color: '#5C3018',
    pattern: [1, 0, 0, 0.6, 0, 1, 0, 0.5, 1, 0, 0, 0, 1, 0, 0.7, 0.5],
    notes: [A2, A2, A2, C3, A2, E3, A2, A2, A2, A2, A2, A2, G3 / 2, G3 / 2, A2, D3],
  },
  {
    id: 'subpulse',
    label: 'Sub Pulse',
    group: 'bass',
    color: '#3A2A1E',
    pattern: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    notes: [A2 / 2, 0, 0, 0, 0, 0, 0, 0, A2 / 2, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'wobble',
    label: 'Wobble Bass',
    group: 'bass',
    color: '#2E1F54',
    // Dubstep-style half-time wobble — long notes on beats 1 and 3
    pattern: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0.6, 0],
    notes: [A2, 0, 0, 0, 0, 0, 0, 0, G3 / 2, 0, 0, 0, 0, 0, D3, 0],
  },
  // KEYS
  {
    id: 'rhodes',
    label: 'Rhodes Stab',
    group: 'keys',
    color: '#7A4A5F',
    pattern: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    notes: [0, 0, A3, 0, 0, 0, C4, 0, 0, 0, E4, 0, 0, 0, A4, 0],
  },
  {
    id: 'guitar',
    label: 'Wah Guitar',
    group: 'keys',
    color: '#B8843A',
    pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    notes: [0, E3, 0, E3, 0, G3, 0, G3, 0, E3, 0, E3, 0, A3, 0, A3],
  },
  {
    id: 'pluck',
    label: 'Tropical Pluck',
    group: 'keys',
    color: '#88C878',
    pattern: [1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    notes: [A4, 0, 0, E4, G4, 0, E4, 0, A4, 0, 0, 0, G4, 0, E4, 0],
  },
  {
    id: 'arp',
    label: 'Ratatat Arp',
    group: 'keys',
    color: '#5A8AAA',
    // Fast 16th arpeggio — Ratatat-ish melodic electric
    pattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    notes: [A3, C4, E4, G4, A4, G4, E4, C4, A3, C4, E4, G4, A4, E4, C4, E4],
  },
  // LEAD
  {
    id: 'lead',
    label: 'Lead Motif',
    group: 'lead',
    color: '#6890B0',
    pattern: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    notes: [A4, 0, 0, 0, 0, 0, C4 * 2, 0, 0, 0, E4, 0, 0, 0, 0, 0],
  },
  {
    id: 'chop',
    label: 'Vocal Chop',
    group: 'lead',
    color: '#B08AA0',
    // Nujabes / Gramatik-style vocal stab — sparse, in pocket
    pattern: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    notes: [0, 0, 0, 0, 0, 0, 0, E4, 0, 0, 0, 0, 0, 0, 0, G4],
  },
  // PADS
  {
    id: 'pad',
    label: 'Atmo Pad',
    group: 'pads',
    color: '#9B6BA0',
    pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    notes: [A3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
];

const GROUPS: { id: Group; label: string; accent: string }[] = [
  { id: 'drums', label: 'Drums', accent: '#D4805A' },
  { id: 'bass', label: 'Bass', accent: '#5C3018' },
  { id: 'keys', label: 'Keys', accent: '#B8843A' },
  { id: 'lead', label: 'Lead', accent: '#6890B0' },
  { id: 'pads', label: 'Pads', accent: '#9B6BA0' },
];

// ─────────────────────────────────────────────────────────────
// Synth voices — raw Web Audio, shared with the Chill Machine
// in lib/drum-voices.ts. Each track maps to one trigger.
// ─────────────────────────────────────────────────────────────

type Voice = (
  ctx: AudioContext,
  when: number,
  velocity: number,
  out: AudioNode,
  noteFreq?: number,
) => void;

const VOICES: Record<TrackId, Voice> = {
  kick: triggerKick,
  snare: triggerSnare,
  clap: triggerClap,
  hihat: triggerHihat,
  perc: triggerPerc,
  bass: (ctx, when, vel, out, f) => triggerBass(ctx, when, vel, out, f ?? A2),
  subpulse: (ctx, when, vel, out, f) => triggerSubPulse(ctx, when, vel, out, f ?? A2 / 2),
  wobble: (ctx, when, vel, out, f) => triggerWobble(ctx, when, vel, out, f ?? A2),
  rhodes: (ctx, when, vel, out, f) => triggerRhodes(ctx, when, vel, out, f ?? A3),
  guitar: (ctx, when, vel, out, f) => triggerGuitar(ctx, when, vel, out, f ?? E3),
  pluck: (ctx, when, vel, out, f) => triggerPluck(ctx, when, vel, out, f ?? A4),
  arp: (ctx, when, vel, out, f) => triggerArp(ctx, when, vel, out, f ?? A4),
  lead: (ctx, when, vel, out, f) => triggerLead(ctx, when, vel, out, f ?? A4),
  chop: (ctx, when, vel, out, f) => triggerChop(ctx, when, vel, out, f ?? A4),
  pad: (ctx, when, vel, out, f) => triggerPad(ctx, when, vel, out, f ?? A3),
};

// ─────────────────────────────────────────────────────────────
// Blend helper — lerp numeric fields in voiceTweaks sub-objects
// ─────────────────────────────────────────────────────────────

function blendVoiceTweaks(
  a: PresetVoiceTweaks,
  b: PresetVoiceTweaks,
  t: number,
): PresetVoiceTweaks {
  function lerpObj<T extends object>(objA: T | undefined, objB: T | undefined): T | undefined {
    if (!objA && !objB) return undefined;
    const result: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(objA ?? {}), ...Object.keys(objB ?? {})]);
    for (const k of keys) {
      const va = (objA as Record<string, unknown> | undefined)?.[k];
      const vb = (objB as Record<string, unknown> | undefined)?.[k];
      result[k] =
        typeof va === 'number' && typeof vb === 'number'
          ? va * (1 - t) + vb * t
          : t < 0.5
            ? (va ?? vb)
            : (vb ?? va);
    }
    return result as T;
  }
  return {
    kick: lerpObj(a.kick, b.kick),
    snare: lerpObj(a.snare, b.snare),
    hihat: lerpObj(a.hihat, b.hihat),
    bass: lerpObj(a.bass, b.bass),
    pad: lerpObj(a.pad, b.pad),
    rhodes: lerpObj(a.rhodes, b.rhodes),
  };
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

const DEFAULT_ACTIVE: Record<TrackId, boolean> = {
  kick: true,
  snare: true,
  clap: false,
  hihat: true,
  perc: false,
  bass: true,
  subpulse: false,
  wobble: false,
  rhodes: false,
  guitar: false,
  pluck: false,
  arp: false,
  lead: false,
  chop: false,
  pad: true,
};

type Mode = 'full' | 'drop' | 'breakdown' | 'silence';

export default function GrooveMachine() {
  const soundSession = useSoundSession();
  const [playing, setPlaying] = useState(false);
  // Preset state — picks one of the 7 curated soundscapes (Sun-up
  // Funk / Tech House / Tropical / Slow Roll / Boom Bap / Epic
  // Electro / Lofi Rooftop). Drives bpm, swing, default-active
  // tracks, and per-track pattern + note overrides. See
  // lib/groove-presets.ts.
  const [presetId, setPresetId] = useState<string>(DEFAULT_PRESET_ID);
  const [bpm, setBpm] = useState(112);
  const [active, setActive] = useState<Record<TrackId, boolean>>(DEFAULT_ACTIVE);
  const [mode, setMode] = useState<Mode>('full');
  const [openGroups, setOpenGroups] = useState<Record<Group, boolean>>({
    drums: true,
    bass: true,
    keys: true,
    lead: false,
    pads: false,
  });
  const [step, setStep] = useState(0);
  // ── Pattern sequencer (global toggle kept for power users) ──
  const [showSequencer, setShowSequencer] = useState(false);
  const [customPatterns, setCustomPatterns] = useState<Partial<Record<TrackId, number[]>>>({});
  // ── Per-group pads (open = show MPC step grid for that section) ──
  const [groupPadsOpen, setGroupPadsOpen] = useState<Record<Group, boolean>>({
    drums: false,
    bass: false,
    keys: false,
    lead: false,
    pads: false,
  });
  function toggleGroupPads(grp: Group) {
    setGroupPadsOpen((prev) => ({ ...prev, [grp]: !prev[grp] }));
  }
  // ── Layer blend ──
  const [showLayering, setShowLayering] = useState(false);
  const [blendPresetId, setBlendPresetId] = useState<string | null>(null);
  const [blend, setBlend] = useState(0);
  // ── Tempo sync ──
  const [tempoSyncEnabled, setTempoSyncEnabled] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextStepRef = useRef(0);
  const nextTimeRef = useRef(0);
  const modeRef = useRef(mode);
  const activeRef = useRef(active);
  const bpmRef = useRef(bpm);
  // Swing amount comes from the active preset; ref so the scheduler
  // closure picks up the latest without recreation.
  const swingRef = useRef(0.17);
  // Master bus — every voice connects here instead of ctx.destination
  // so we can put a compressor + reverb send + master gain in one
  // place. Built once in startAudio. Without this everything plays
  // dry and clipped; with it the mix has glue.
  const masterInRef = useRef<GainNode | null>(null);
  const customPatternsRef = useRef<Partial<Record<TrackId, number[]>>>({});
  const blendRef = useRef(0);
  const blendPresetRef = useRef<GroovePreset | null>(null);
  const paintStateRef = useRef<{ active: boolean; targetVel: number } | null>(null);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  // Compute the active tracks by applying preset overrides on top
  // of the base TRACKS. This is what the scheduler iterates over.
  const preset = useMemo(() => getPreset(presetId), [presetId]);
  const activeTracks = useMemo(
    () =>
      TRACKS.map((t) => ({
        ...t,
        pattern: preset.patternOverrides?.[t.id] ?? t.pattern,
        notes: preset.notesOverrides?.[t.id] ?? t.notes,
      })),
    [preset],
  );
  const blendPreset = useMemo(
    () => (blendPresetId ? getPreset(blendPresetId) : null),
    [blendPresetId],
  );

  // When blend > 0, interpolate BPM between A and B presets
  const effectiveBpm = useMemo(
    () =>
      blend > 0 && blendPreset ? Math.round(bpm * (1 - blend) + blendPreset.bpm * blend) : bpm,
    [bpm, blend, blendPreset],
  );

  // Effective patterns: user custom edits overlay the preset-derived patterns
  const effectivePatterns = useMemo(() => {
    const result: Partial<Record<TrackId, number[]>> = {};
    for (const t of activeTracks) {
      result[t.id] = customPatterns[t.id] ?? t.pattern;
    }
    return result;
  }, [activeTracks, customPatterns]);

  const tracksRef = useRef(activeTracks);
  useEffect(() => {
    tracksRef.current = activeTracks;
    swingRef.current =
      blend > 0 && blendPreset
        ? preset.swing * (1 - blend) + blendPreset.swing * blend
        : preset.swing;
    const tweaks =
      blend > 0 && blendPreset
        ? blendVoiceTweaks(preset.voiceTweaks ?? {}, blendPreset.voiceTweaks ?? {}, blend)
        : preset.voiceTweaks;
    setCurrentVoiceTweaks(tweaks);
  }, [activeTracks, preset.swing, preset.voiceTweaks, blend, blendPreset]);

  /**
   * Apply a preset: switch presetId, set bpm + swing + active set.
   * Persists the choice to localStorage so it survives reloads.
   */
  const applyPreset = useCallback(
    (p: GroovePreset) => {
      setPresetId(p.id);
      setBpm(p.bpm);
      swingRef.current = p.swing;
      setCustomPatterns({});
      // New active set: only tracks listed in the preset's
      // activeSet are on; everything else off.
      const next: Record<TrackId, boolean> = {
        kick: false,
        snare: false,
        clap: false,
        hihat: false,
        perc: false,
        bass: false,
        subpulse: false,
        wobble: false,
        rhodes: false,
        guitar: false,
        pluck: false,
        arp: false,
        lead: false,
        chop: false,
        pad: false,
      };
      for (const id of Object.keys(p.activeSet) as TrackId[]) {
        if (p.activeSet[id]) next[id] = true;
      }
      setActive(next);
      if (mode !== 'full') setMode('full');
      try {
        localStorage.setItem(PRESET_LS_KEY, p.id);
      } catch {
        /* silent */
      }
    },
    [mode],
  );

  // Load saved preset on mount.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRESET_LS_KEY);
      if (saved) {
        const p = getPreset(saved);
        applyPreset(p);
      }
    } catch {
      /* silent */
    }
  }, []);

  // Keep refs in sync with state for scheduler closure access
  useEffect(() => {
    customPatternsRef.current = customPatterns;
  }, [customPatterns]);
  useEffect(() => {
    blendRef.current = blend;
    blendPresetRef.current = blendPreset;
  }, [blend, blendPreset]);
  useEffect(() => {
    bpmRef.current = effectiveBpm;
  }, [effectiveBpm]);

  // Tempo sync: listen for binaural beat frequency events
  useEffect(() => {
    if (!tempoSyncEnabled) return;
    function handler(e: Event) {
      const hz = (e as CustomEvent<{ hz: number }>).detail.hz;
      setBpm(Math.max(80, Math.min(140, Math.round(60 + hz * 10))));
    }
    window.addEventListener('binaural:beatfreq', handler);
    return () => window.removeEventListener('binaural:beatfreq', handler);
  }, [tempoSyncEnabled]);

  // Paint mode — end drag on mouse/touch up anywhere in the document
  useEffect(() => {
    function onUp() {
      paintStateRef.current = null;
    }
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  // Per-bar cached variation patterns. At the start of each bar
  // (stepIdx === 0) the scheduler picks a fresh variation per
  // track from the preset's pool based on the current arc phase.
  // Without this, the scheduler would re-pick on every step and
  // the bar's pattern would be incoherent.
  const barPatternsRef = useRef<Partial<Record<TrackId, number[]>>>({});
  const presetRef = useRef<GroovePreset>(getPreset(DEFAULT_PRESET_ID));
  useEffect(() => {
    presetRef.current = preset;
    // Clear cached variations so the next bar repicks from the
    // new preset's pool.
    barPatternsRef.current = {};
  }, [preset]);

  const scheduleNextNotes = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const secondsPerSixteenth = 60 / bpmRef.current / 4;
    // Swing: offbeat 16ths sit late by `swingRef.current` of a 16th.
    // Per-preset (Tech House = 0.04 mechanical; Lofi = 0.25 heavy).
    const swingAmount = swingRef.current;
    const lookahead = 0.1;
    while (nextTimeRef.current < ctx.currentTime + lookahead) {
      const totalStep = nextStepRef.current;
      const stepIdx = totalStep % 16;
      const bar = Math.floor(totalStep / 16);
      // On bar 4 of every 4-bar cycle: a drum fill at steps 14-15 —
      // adds life without needing a second pattern.
      const isLastBarOfCycle = bar % 4 === 3;
      const isFillWindow = isLastBarOfCycle && stepIdx >= 14;
      const currentMode = modeRef.current;
      const currentActive = activeRef.current;
      // At the start of each bar, pick fresh variations per track.
      // The arc phase decides which variation is favoured (intro
      // sparse, chorus busy, breakdown empty, etc.).
      if (stepIdx === 0) {
        const phase = getPhaseForBar(bar);
        const pools = presetRef.current.variationPools;
        const next: Partial<Record<TrackId, number[]>> = {};
        if (pools) {
          for (const trackId of Object.keys(pools) as TrackId[]) {
            const pool = pools[trackId];
            if (!pool || pool.length === 0) continue;
            const idx = pickVariationIndex(phase, pool.length);
            next[trackId] = pool[idx];
          }
        }
        barPatternsRef.current = next;
      }
      // Swung timing: offbeat 16ths (odd step index) pushed later.
      const swingOffset = stepIdx % 2 === 1 ? secondsPerSixteenth * swingAmount : 0;
      const when = nextTimeRef.current + swingOffset;
      const visualEnergy: Record<Group, number> = {
        drums: 0,
        bass: 0,
        keys: 0,
        lead: 0,
        pads: 0,
      };

      for (const track of tracksRef.current) {
        let allowed = currentActive[track.id];
        if (currentMode === 'breakdown') {
          allowed = track.id === 'bass' || track.id === 'pad';
        } else if (currentMode === 'silence') {
          allowed = track.id === 'pad';
        } else if (currentMode === 'drop') {
          // DROP: drums muted during the riser — bass + pad keep a
          // bed under the tension, everything else silent except the
          // pad and wobble.
          if (track.group === 'drums') allowed = false;
        }
        if (!allowed) continue;
        // Resolve pattern: custom edit > blend > variation pool > base pattern
        const customPat = customPatternsRef.current[track.id];
        const variationPattern = barPatternsRef.current[track.id];
        const bl = blendRef.current;
        const blendPr = blendPresetRef.current;
        let patternForBar: number[];
        if (customPat) {
          patternForBar = customPat;
        } else if (bl > 0 && blendPr) {
          const bPat = blendPr.patternOverrides?.[track.id] ?? track.pattern;
          const aPat = variationPattern ?? track.pattern;
          patternForBar = aPat.map((v, i) => v * (1 - bl) + (bPat[i] ?? 0) * bl);
        } else {
          patternForBar = variationPattern ?? track.pattern;
        }
        let vel = patternForBar[stepIdx];
        // Fill bar: add extra snare + kick hits on 14-15 to sell the
        // approach to the downbeat.
        if (isFillWindow && currentMode === 'full') {
          if (track.id === 'snare' && (stepIdx === 14 || stepIdx === 15)) vel = 0.85;
          if (track.id === 'kick' && stepIdx === 15) vel = 0.7;
        }
        if (!vel) continue;
        const freq = track.notes?.[stepIdx] ?? undefined;
        if (freq === 0) continue;
        // Humanization — drum tracks get ±5 % velocity and ±3 ms
        // timing jitter so the grid stops feeling like a machine.
        // Pitched tracks stay tight to keep harmonic alignment.
        let humanizedVel = vel;
        let humanizedWhen = when;
        if (track.group === 'drums') {
          humanizedVel = vel * (0.95 + Math.random() * 0.1);
          humanizedWhen = when + (Math.random() - 0.5) * 0.006;
        }
        visualEnergy[track.group] += humanizedVel;
        const out = masterInRef.current ?? ctx.destination;
        VOICES[track.id](ctx, humanizedWhen, humanizedVel, out, freq);
      }
      window.dispatchEvent(
        new CustomEvent('colourmap:groove-visual-step', {
          detail: {
            step: stepIdx,
            bar,
            bpm: bpmRef.current,
            preset: presetRef.current.id,
            energy: visualEnergy,
          },
        }),
      );
      nextTimeRef.current += secondsPerSixteenth;
      nextStepRef.current++;
      setStep(stepIdx);
    }
  }, []);

  const startAudio = useCallback(() => {
    // biome-ignore lint/suspicious/noExplicitAny: webkit AudioContext
    const Ctor: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!ctxRef.current) ctxRef.current = new Ctor();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') void ctx.resume();

    // Build the master bus on first play. master input → compressor
    // (-18 dB threshold, 4:1 ratio) → split: dry to destination + a
    // gentle reverb send for cohesion. Without this the mix sounds
    // dry and the kick clips on full mode.
    if (!masterInRef.current) {
      const masterIn = ctx.createGain();
      masterIn.gain.value = 0.85;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      comp.attack.value = 0.005;
      comp.release.value = 0.12;
      const dry = ctx.createGain();
      dry.gain.value = 1;
      // Reverb send: small impulse buffer, low send level so it just
      // glues without flooding the mix.
      const len = ctx.sampleRate * 1.6;
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.5;
      }
      const rev = ctx.createConvolver();
      rev.buffer = buf;
      const wet = ctx.createGain();
      wet.gain.value = 0.18;
      masterIn.connect(comp);
      comp.connect(dry);
      comp.connect(rev);
      rev.connect(wet);
      dry.connect(ctx.destination);
      wet.connect(ctx.destination);
      masterInRef.current = masterIn;
    }

    nextStepRef.current = 0;
    nextTimeRef.current = ctx.currentTime + 0.05;
    setStep(0);
    scheduleNextNotes();
    timerRef.current = setInterval(scheduleNextNotes, 25);
    setPlaying(true);
    // Register with global SoundSession — pill shows on other pages
    soundSession.setActive('groove-machine', `${preset.name} · ${bpm}bpm`);
  }, [scheduleNextNotes, soundSession, preset.name, bpm]);

  useEffect(() => {
    try {
      window.localStorage.setItem('colourmap:groove-bpm', String(bpm));
      window.localStorage.setItem('colourmap:groove-preset', presetId);
    } catch {}
  }, [bpm, presetId]);

  const stopAudio = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
    setStep(0);
    soundSession.setPlaying(false);
  }, [soundSession]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      ctxRef.current?.close().catch(() => {});
    },
    [],
  );

  function toggleTrack(id: TrackId) {
    setActive((prev) => ({ ...prev, [id]: !prev[id] }));
    if (mode !== 'full') setMode('full'); // any manual tweak returns to full
  }

  function toggleGroup(g: Group) {
    setOpenGroups((prev) => ({ ...prev, [g]: !prev[g] }));
  }

  function runDrop() {
    const ctx = ctxRef.current;
    const twoBarsSec = (60 / bpmRef.current) * 4 * 2;
    setMode('drop');
    // Schedule a 2-bar noise riser from now. The drums stay muted
    // (mode 'drop') while this rises, building tension; at the end
    // we snap back to 'full' and the first beat after slams. We also
    // schedule a single big kick at the slam moment so the return is
    // visceral, not just a re-mute-off.
    if (ctx) {
      const now = ctx.currentTime + 0.05;
      const out = masterInRef.current ?? ctx.destination;
      triggerRiser(ctx, now, twoBarsSec, out);
      triggerKick(ctx, now + twoBarsSec, 1.0, out);
    }
    setTimeout(() => setMode('full'), (twoBarsSec * 1000) | 0);
  }

  function randomizeGroove() {
    // Keep anchors on: kick, bass, pad. Randomize everything else.
    const ANCHORS: TrackId[] = ['kick', 'bass', 'pad'];
    const next: Record<TrackId, boolean> = { ...DEFAULT_ACTIVE };
    for (const id of Object.keys(next) as TrackId[]) {
      if (ANCHORS.includes(id)) {
        next[id] = true;
      } else {
        // 35% chance for each non-anchor — gives a coherent sparse mix
        next[id] = Math.random() < 0.35;
      }
    }
    setActive(next);
    if (mode !== 'full') setMode('full');
  }

  // ── Sequencer handlers ──
  function handleStepMouseDown(trackId: TrackId, stepIdx: number, currentVel: number) {
    const targetVel = currentVel > 0 ? 0 : 0.8;
    paintStateRef.current = { active: true, targetVel };
    setCustomPatterns((prev) => {
      const base = prev[trackId] ?? activeTracks.find((t) => t.id === trackId)?.pattern ?? [];
      const next = [...base];
      next[stepIdx] = targetVel;
      return { ...prev, [trackId]: next };
    });
  }

  function handleStepMouseEnter(trackId: TrackId, stepIdx: number) {
    if (!paintStateRef.current?.active) return;
    const targetVel = paintStateRef.current.targetVel;
    setCustomPatterns((prev) => {
      const base = prev[trackId] ?? activeTracks.find((t) => t.id === trackId)?.pattern ?? [];
      const next = [...base];
      next[stepIdx] = targetVel;
      return { ...prev, [trackId]: next };
    });
  }

  const activeCount = Object.values(active).filter(Boolean).length;
  const totalTracks = TRACKS.length;

  // "Save this groove" — capture a snapshot of the current pattern
  // (bpm, mode, active tracks) and POST it to the user's Notebook
  // (Ideas). Same shape as the Chill Machine save-this-moment button
  // so the user finds them all in one place. Local fallback if the
  // API is unreachable.
  const [momentStatus, setMomentStatus] = useState<null | 'saving' | 'saved' | 'error'>(null);
  async function saveGrooveToNotebook() {
    const activeTracks = TRACKS.filter((t) => active[t.id]);
    const trackLabels = activeTracks.map((t) => t.label).join(', ');
    const stamp = new Date().toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const title = `Groove · ${stamp} · ${bpm}bpm`;
    const lines = [
      `Tempo ${bpm} bpm · mode ${mode}`,
      `${activeCount}/${totalTracks} tracks active`,
      trackLabels ? `Tracks: ${trackLabels}` : 'Tracks: (none)',
    ];
    const body = {
      category: 'ideas',
      title,
      content: lines.join('\n'),
      tags: ['groove-machine', 'sound-snapshot'],
    };

    setMomentStatus('saving');
    try {
      const res = await fetch('/api/notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('api');
      setMomentStatus('saved');
    } catch {
      try {
        const raw = localStorage.getItem('colourmap:notebook-entries');
        const existing = raw ? JSON.parse(raw) : [];
        const localEntry = {
          id: crypto.randomUUID(),
          ...body,
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(
          'colourmap:notebook-entries',
          JSON.stringify([localEntry, ...existing]),
        );
        setMomentStatus('saved');
      } catch {
        setMomentStatus('error');
      }
    }
    setTimeout(() => setMomentStatus(null), 1800);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '22px',
            fontWeight: 700,
            fontStyle: 'italic',
            color: '#5C3018',
          }}
        >
          Groove Machine
        </p>
        <p
          className="mt-1 px-4"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '12px',
            fontStyle: 'italic',
            color: '#8A6A4A',
            opacity: 0.8,
          }}
        >
          {preset.vibe}
        </p>
      </div>

      {/* Soundscape picker — 7 big colour dots, one per preset.
          Per Martin (2026-04-25): "do the 7 groove landscapes ...
          make them complementary and differentiated." Spec:
          docs/specs/groove-machine-7-soundscapes.md. Horizontal
          scroll on phone, full row on desktop. Tap → preset
          reconfigures bpm + swing + active tracks + per-track
          patterns. */}
      <div
        className="-mx-4 flex snap-x snap-mandatory items-center gap-4 overflow-x-auto px-6 pb-2 pt-1 md:mx-0 md:flex-wrap md:justify-center md:gap-3 md:overflow-visible md:px-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {GROOVE_PRESETS.map((p) => {
          const isActive = p.id === presetId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className="flex shrink-0 cursor-pointer snap-center flex-col items-center gap-1.5 bg-transparent transition-all"
              style={{
                border: 'none',
                padding: 0,
                opacity: isActive ? 1 : 0.55,
              }}
              aria-pressed={isActive}
              title={`${p.name} — ${p.vibe}`}
            >
              <span
                className="block rounded-full transition-all"
                style={{
                  width: isActive ? 56 : 44,
                  height: isActive ? 56 : 44,
                  background: p.dot,
                  boxShadow: isActive
                    ? `0 6px 18px -6px ${p.dot}`
                    : '0 2px 6px rgba(94,58,20,0.08)',
                  border: `2px solid ${p.dot}`,
                  // Subtle pulse animation when active + playing
                  animation: isActive && playing ? 'gm-dot-pulse 2s ease-in-out infinite' : 'none',
                }}
              />
              <span
                className="text-center"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 600,
                  color: p.dot,
                  letterSpacing: '0.04em',
                  maxWidth: 84,
                  lineHeight: 1.15,
                }}
              >
                {p.name}
              </span>
            </button>
          );
        })}
      </div>
      <style>{`@keyframes gm-dot-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }`}</style>

      <div
        className="rounded-2xl border px-4 py-3"
        style={{ background: '#F3E8D2', borderColor: `${preset.dot}35` }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p
              className="uppercase"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 10,
                letterSpacing: '0.18em',
                color: preset.dot,
                fontWeight: 700,
              }}
            >
              concert visual seed
            </p>
            <p
              className="mt-1"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 12,
                lineHeight: 1.45,
                color: '#7A5438',
              }}
            >
              Groove now broadcasts a desert-stage visual pulse: drums push dots, bass expands the
              field, keys and pads thicken the glow.
            </p>
          </div>
          <a
            href="/geometry-field"
            style={{
              flexShrink: 0,
              borderRadius: 999,
              border: `1px solid ${preset.dot}55`,
              background: `${preset.dot}16`,
              color: preset.dot,
              padding: '8px 12px',
              fontFamily: 'var(--font-serif)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            visuals
          </a>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {GROUPS.map((group) => {
            const activeInGroup = TRACKS.some(
              (track) => track.group === group.id && active[track.id],
            );
            return (
              <div
                key={group.id}
                title={`${group.label} ${activeInGroup ? 'feeds visuals' : 'silent'}`}
                style={{
                  height: 7,
                  borderRadius: 999,
                  background: activeInGroup ? group.accent : '#C4A06022',
                  opacity: activeInGroup ? 0.88 : 0.38,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Desktop DJ layout: 2 columns on md+. Phone: stacked. */}
      <div className="space-y-5 md:grid md:grid-cols-[1fr_320px] md:gap-8 md:space-y-0">
        {/* LEFT — track channel strips */}
        <div className="space-y-3">
          {/* Sequencer toggle */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setShowSequencer((v) => !v)}
              className="cursor-pointer rounded-lg px-3 py-1.5 transition-all"
              style={{
                background: showSequencer ? '#5C3018' : 'transparent',
                border: `1.5px solid ${showSequencer ? '#5C3018' : '#C4A06040'}`,
                color: showSequencer ? '#F3E8D2' : '#8A6A4A',
                fontFamily: 'var(--font-serif)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              {showSequencer ? '✕ Sequencer' : '⊞ Sequencer'}
            </button>
            {showSequencer && Object.keys(customPatterns).length > 0 && (
              <button
                type="button"
                onClick={() => setCustomPatterns({})}
                className="cursor-pointer text-xs underline"
                style={{
                  color: '#8A6A4A',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '11px',
                  background: 'none',
                  border: 'none',
                }}
              >
                reset edits
              </button>
            )}
          </div>
          {GROUPS.map((grp) => {
            const tracksInGroup = TRACKS.filter((t) => t.group === grp.id);
            const groupActiveCount = tracksInGroup.filter((t) => active[t.id]).length;
            const isOpen = openGroups[grp.id];
            return (
              <div
                key={grp.id}
                className="overflow-hidden rounded-2xl border"
                style={{ borderColor: `${grp.accent}30` }}
              >
                <div className="flex items-center" style={{ background: `${grp.accent}10` }}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(grp.id)}
                    className="flex flex-1 cursor-pointer items-center justify-between px-4 py-3 transition-all"
                    style={{ background: 'none', border: 'none' }}
                  >
                    <span
                      className="uppercase"
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '14px',
                        fontWeight: 700,
                        letterSpacing: '0.18em',
                        color: grp.accent,
                      }}
                    >
                      {grp.label}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '11px',
                        color: grp.accent,
                        opacity: 0.7,
                      }}
                    >
                      {groupActiveCount}/{tracksInGroup.length} · {isOpen ? '▾' : '▸'}
                    </span>
                  </button>
                  {isOpen && (
                    <button
                      type="button"
                      onClick={() => toggleGroupPads(grp.id)}
                      className="cursor-pointer rounded-lg px-2.5 py-1 transition-all mr-3"
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '10px',
                        fontWeight: 600,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        background: groupPadsOpen[grp.id] ? `${grp.accent}25` : 'transparent',
                        border: `1px solid ${groupPadsOpen[grp.id] ? `${grp.accent}60` : `${grp.accent}30`}`,
                        color: groupPadsOpen[grp.id] ? grp.accent : `${grp.accent}99`,
                      }}
                    >
                      {groupPadsOpen[grp.id] ? '✕ pads' : '⊞ pads'}
                    </button>
                  )}
                </div>
                {isOpen && (
                  <div className="space-y-1.5 bg-transparent px-3 py-2 animate-in fade-in duration-150">
                    {tracksInGroup.map((t) => {
                      const on = active[t.id];
                      return (
                        <div key={t.id}>
                          <button
                            type="button"
                            onClick={() => toggleTrack(t.id)}
                            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                            style={{
                              background: on ? `${t.color}1E` : 'transparent',
                              border: `1px solid ${on ? `${t.color}60` : `${t.color}20`}`,
                            }}
                            aria-pressed={on}
                          >
                            <span
                              className="block shrink-0 rounded-full"
                              style={{
                                width: 12,
                                height: 12,
                                background: on ? t.color : 'transparent',
                                border: `2px solid ${t.color}`,
                              }}
                            />
                            <span
                              className="flex-1 text-left"
                              style={{
                                fontFamily: 'var(--font-serif)',
                                fontSize: '14px',
                                fontWeight: on ? 700 : 500,
                                color: on ? t.color : '#5C3018',
                                opacity: on ? 1 : 0.75,
                              }}
                            >
                              {t.label}
                            </span>
                            {/* Mini step display (hidden when sequencer is open) */}
                            {!showSequencer && (
                              <div className="hidden md:flex gap-[2px]">
                                {(effectivePatterns[t.id] ?? t.pattern).map((v, i) => (
                                  <span
                                    key={i}
                                    className="block rounded-sm"
                                    style={{
                                      width: 4,
                                      height: v > 0 ? 10 : 4,
                                      background: t.color,
                                      opacity:
                                        playing && step === i && on ? 1 : v > 0 && on ? 0.5 : 0.15,
                                      transition: 'opacity 60ms',
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </button>
                          {/* Interactive step sequencer grid */}
                          {showSequencer && (
                            <div
                              className="px-3 pb-2"
                              style={{ userSelect: 'none', touchAction: 'none' }}
                            >
                              <div className="mt-1 flex gap-px">
                                {(effectivePatterns[t.id] ?? t.pattern).map((vel, i) => {
                                  const isActive = vel > 0;
                                  const isCurrent = playing && step === i;
                                  return (
                                    <button
                                      key={i}
                                      type="button"
                                      className="flex-1 rounded-sm"
                                      style={{
                                        minWidth: 0,
                                        height: 20,
                                        background: isActive
                                          ? `${t.color}${on ? 'CC' : '55'}`
                                          : `${t.color}18`,
                                        border: `1px solid ${
                                          isCurrent
                                            ? t.color
                                            : isActive
                                              ? `${t.color}70`
                                              : `${t.color}20`
                                        }`,
                                        boxShadow: isCurrent && on ? `0 0 4px ${t.color}` : 'none',
                                        cursor: 'pointer',
                                        transition: 'background 60ms',
                                      }}
                                      onMouseDown={() => handleStepMouseDown(t.id, i, vel)}
                                      onMouseEnter={() => handleStepMouseEnter(t.id, i)}
                                      aria-pressed={isActive}
                                      aria-label={`Step ${i + 1} ${isActive ? 'on' : 'off'}`}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Per-group pads panel — MPC-style, open/closable per section */}
                    {groupPadsOpen[grp.id] && (
                      <div
                        className="mt-2 rounded-xl animate-in fade-in duration-150"
                        style={{
                          border: `1px solid ${grp.accent}20`,
                          background: `${grp.accent}08`,
                          padding: '10px 8px 8px',
                        }}
                      >
                        <div
                          style={{
                            color: `${grp.accent}B8`,
                            fontFamily: 'var(--font-serif)',
                            fontSize: 10,
                            letterSpacing: '0.08em',
                            margin: '0 2px 8px',
                          }}
                        >
                          {grp.id === 'drums'
                            ? 'strike pads'
                            : grp.id === 'bass'
                              ? 'pulse gates'
                              : grp.id === 'keys'
                                ? 'chord tiles'
                                : grp.id === 'lead'
                                  ? 'motif sparks'
                                  : 'atmosphere ribbons'}
                        </div>
                        <div className="space-y-2">
                          {tracksInGroup.map((t) => {
                            const on = active[t.id];
                            const pattern = effectivePatterns[t.id] ?? t.pattern;
                            return (
                              <div key={t.id} className="flex items-center gap-2">
                                <span
                                  style={{
                                    fontFamily: 'var(--font-serif)',
                                    fontSize: '10px',
                                    fontWeight: on ? 700 : 500,
                                    color: on ? t.color : '#8A6A4A',
                                    opacity: on ? 1 : 0.5,
                                    width: 40,
                                    flexShrink: 0,
                                    textAlign: 'right',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  {t.label}
                                </span>
                                {/* 4 beat groups × 4 steps = 16 pads */}
                                <div
                                  className="flex flex-1 gap-[3px]"
                                  style={{ userSelect: 'none', touchAction: 'none' }}
                                >
                                  {[0, 4, 8, 12].map((beatStart) => (
                                    <div key={beatStart} className="flex flex-1 gap-[2px]">
                                      {Array.from({ length: 4 }, (_, j) => {
                                        const i = beatStart + j;
                                        const vel = pattern[i] ?? 0;
                                        const isActive = vel > 0;
                                        const isCurrent = playing && step === i;
                                        const padShape =
                                          grp.id === 'drums'
                                            ? '50%'
                                            : grp.id === 'bass'
                                              ? '6px 6px 14px 14px'
                                              : grp.id === 'keys'
                                                ? '4px'
                                                : grp.id === 'lead'
                                                  ? '12px 2px 12px 2px'
                                                  : '999px';
                                        const padScale =
                                          grp.id === 'bass'
                                            ? 0.72 + vel * 0.38
                                            : grp.id === 'pads'
                                              ? 0.86 + vel * 0.18
                                              : 1;
                                        return (
                                          <button
                                            key={i}
                                            type="button"
                                            className="flex-1 transition-all"
                                            style={{
                                              minWidth: 0,
                                              height:
                                                grp.id === 'pads'
                                                  ? 18
                                                  : grp.id === 'bass'
                                                    ? 28
                                                    : 24,
                                              background: isCurrent
                                                ? t.color
                                                : isActive
                                                  ? `${t.color}${on ? 'BB' : '55'}`
                                                  : `${t.color}1A`,
                                              borderRadius: padShape,
                                              border: `1px solid ${
                                                isCurrent
                                                  ? t.color
                                                  : isActive
                                                    ? `${t.color}65`
                                                    : `${t.color}22`
                                              }`,
                                              boxShadow:
                                                isCurrent && on ? `0 0 5px ${t.color}80` : 'none',
                                              cursor: 'pointer',
                                              transform:
                                                grp.id === 'keys'
                                                  ? `rotate(45deg) scale(${isCurrent ? 1.08 : padScale})`
                                                  : `scaleY(${padScale})`,
                                              transition: 'background 60ms, transform 80ms',
                                            }}
                                            onMouseDown={() => handleStepMouseDown(t.id, i, vel)}
                                            onMouseEnter={() => handleStepMouseEnter(t.id, i)}
                                            aria-pressed={isActive}
                                            aria-label={`${t.label} step ${i + 1}`}
                                          />
                                        );
                                      })}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {tracksInGroup.some((t) => customPatterns[t.id]) && (
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomPatterns((prev) => {
                                  const next = { ...prev };
                                  for (const t of tracksInGroup) delete next[t.id];
                                  return next;
                                });
                              }}
                              className="cursor-pointer"
                              style={{
                                fontFamily: 'var(--font-serif)',
                                fontSize: '10px',
                                color: grp.accent,
                                opacity: 0.7,
                                background: 'none',
                                border: 'none',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                              }}
                            >
                              reset {grp.label.toLowerCase()}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* RIGHT — transport + actions + vibe meter */}
        <div className="space-y-4">
          {/* Transport */}
          <div
            className="rounded-2xl border px-5 py-5"
            style={{
              background: '#EEDFC4',
              borderColor: '#C4A06040',
            }}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => (playing ? stopAudio() : startAudio())}
                className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full transition-all"
                style={{
                  background: playing ? '#5C3018' : '#C4A060',
                  border: 'none',
                }}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? (
                  <div className="flex gap-1">
                    <span className="block h-5 w-1.5 rounded-sm bg-[#F3E8D2]" />
                    <span className="block h-5 w-1.5 rounded-sm bg-[#F3E8D2]" />
                  </div>
                ) : (
                  <span
                    className="block"
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '14px solid #F3E8D2',
                      borderTop: '9px solid transparent',
                      borderBottom: '9px solid transparent',
                      marginLeft: 3,
                    }}
                  />
                )}
              </button>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {/* Binaural tempo sync toggle */}
                  <button
                    type="button"
                    onClick={() => setTempoSyncEnabled((v) => !v)}
                    title="Sync BPM to Binaural Tuner beat frequency"
                    className="cursor-pointer rounded-lg px-2 py-1 transition-all"
                    style={{
                      background: tempoSyncEnabled ? '#6890B020' : 'transparent',
                      border: `1px solid ${tempoSyncEnabled ? '#6890B0' : '#C4A06040'}`,
                      color: tempoSyncEnabled ? '#6890B0' : '#8A6A4A',
                      fontFamily: 'var(--font-serif)',
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                    }}
                  >
                    ⟲ sync
                  </button>
                  <div>
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '11px',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: '#8A6A4A',
                      }}
                    >
                      Tempo
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '26px',
                        fontWeight: 700,
                        color: '#5C3018',
                      }}
                    >
                      {effectiveBpm}
                      <span style={{ fontSize: '13px', opacity: 0.65, marginLeft: 4 }}>bpm</span>
                      {blend > 0 && blendPreset && (
                        <span style={{ fontSize: '10px', opacity: 0.5, marginLeft: 4 }}>
                          ×{Math.round(blend * 100)}%B
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* Tempo slider — disabled when blending (BPM driven by blend) */}
            <input
              type="range"
              min={80}
              max={140}
              value={blend > 0 && blendPreset ? effectiveBpm : bpm}
              disabled={blend > 0 && blendPreset !== null}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="mt-4 w-full cursor-pointer groove-rainbow-slider"
              aria-label="Tempo"
            />
          </div>

          {/* Mode / action buttons */}
          <div
            className="rounded-2xl border px-4 py-4"
            style={{ background: '#F3E8D2', borderColor: '#C4A06030' }}
          >
            <p
              className="mb-3 text-center uppercase"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '11px',
                letterSpacing: '0.2em',
                color: '#8A6A4A',
              }}
            >
              Dynamics
            </p>
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                label="Full"
                active={mode === 'full'}
                color="#C4A060"
                onClick={() => setMode('full')}
              />
              <ActionButton
                label="Breakdown"
                active={mode === 'breakdown'}
                color="#9B6BA0"
                onClick={() => setMode('breakdown')}
              />
              <ActionButton
                label="Drop"
                active={mode === 'drop'}
                color="#D4805A"
                onClick={runDrop}
              />
              <ActionButton
                label="Silence"
                active={mode === 'silence'}
                color="#7A5A40"
                onClick={() => setMode('silence')}
              />
            </div>
            {/* Randomize — keeps kick + bass + pad, rolls the rest.
                Fastest way to find a new vibe you didn't know you wanted. */}
            <button
              type="button"
              onClick={randomizeGroove}
              className="mt-3 w-full cursor-pointer rounded-xl py-2.5 transition-all hover:opacity-85"
              style={{
                background: 'transparent',
                border: '1.5px dashed #C4A06060',
                color: '#8A6A4A',
                fontFamily: 'var(--font-serif)',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontStyle: 'italic',
              }}
            >
              ✦ new groove
            </button>
            {/* Save this groove → Notebook (Ideas). Mirrors the
                Chill Machine button so saved sounds land in one
                place. */}
            <button
              type="button"
              onClick={saveGrooveToNotebook}
              disabled={momentStatus === 'saving'}
              className="mt-2 w-full cursor-pointer rounded-xl py-2.5 transition-all hover:opacity-85 disabled:opacity-50"
              style={{
                background: momentStatus === 'saved' ? '#7AAA5815' : '#9B6BA010',
                border: `1.5px solid ${momentStatus === 'saved' ? '#7AAA5840' : '#9B6BA040'}`,
                color: momentStatus === 'saved' ? '#7AAA58' : '#9B6BA0',
                fontFamily: 'var(--font-serif)',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              {momentStatus === 'saving'
                ? '…'
                : momentStatus === 'saved'
                  ? '✓ saved to notebook'
                  : momentStatus === 'error'
                    ? 'error · try again'
                    : '→ save to notebook'}
            </button>
          </div>

          {/* Vibe meter */}
          <div
            className="rounded-2xl border px-4 py-4"
            style={{ background: '#F3E8D2', borderColor: '#C4A06030' }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  color: '#8A6A4A',
                }}
              >
                Vibe
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '12px',
                  color: '#5C3018',
                  fontWeight: 600,
                }}
              >
                {activeCount}/{totalTracks}
              </span>
            </div>
            <div className="flex gap-[3px]">
              {TRACKS.map((t, i) => (
                <span
                  key={t.id}
                  className="flex-1 rounded-full"
                  style={{
                    height: 8,
                    background: active[t.id] ? t.color : '#C4A06020',
                    opacity: active[t.id] ? (playing ? 1 : 0.75) : 0.4,
                    transition: 'opacity 120ms',
                  }}
                  title={`${t.label} ${active[t.id] ? 'on' : 'off'}`}
                  data-step={step === i ? '1' : '0'}
                />
              ))}
            </div>
            <p
              className="mt-3 italic"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '11px',
                color: '#8A6A4A',
                opacity: 0.7,
                textAlign: 'center',
              }}
            >
              {mode === 'silence'
                ? 'silence — let it breathe'
                : mode === 'breakdown'
                  ? 'breakdown — bass & pad'
                  : mode === 'drop'
                    ? 'drop incoming…'
                    : activeCount <= 3
                      ? 'sparse'
                      : activeCount <= 6
                        ? 'grooving'
                        : 'full throttle'}
            </p>
          </div>

          {/* Layer blend — crossfade between two presets */}
          <div
            className="rounded-2xl border px-4 py-4"
            style={{ background: '#F3E8D2', borderColor: '#C4A06030' }}
          >
            <button
              type="button"
              onClick={() => {
                setShowLayering((v) => !v);
                if (showLayering) {
                  setBlend(0);
                  setBlendPresetId(null);
                }
              }}
              className="flex w-full cursor-pointer items-center justify-between"
              style={{ background: 'none', border: 'none' }}
            >
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  color: blendPresetId && blend > 0 ? '#9B6BA0' : '#8A6A4A',
                  fontWeight: blendPresetId && blend > 0 ? 700 : 400,
                }}
              >
                Layer
              </span>
              <span style={{ fontSize: '11px', color: '#8A6A4A' }}>{showLayering ? '▾' : '▸'}</span>
            </button>

            {showLayering && (
              <div className="mt-3 space-y-3 animate-in fade-in duration-150">
                {/* B preset picker — smaller dots */}
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '10px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#8A6A4A',
                    marginBottom: 6,
                  }}
                >
                  B Preset
                </p>
                <div className="flex flex-wrap gap-2">
                  {GROOVE_PRESETS.filter((p) => p.id !== presetId).map((p) => {
                    const isSelected = p.id === blendPresetId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setBlendPresetId(p.id);
                          if (blend === 0) setBlend(0.5);
                        }}
                        title={p.name}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 transition-all"
                        style={{
                          background: isSelected ? `${p.dot}18` : 'transparent',
                          border: `1.5px solid ${isSelected ? p.dot : `${p.dot}40`}`,
                        }}
                      >
                        <span
                          className="block rounded-full"
                          style={{ width: 10, height: 10, background: p.dot, flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '11px',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? p.dot : '#5C3018',
                          }}
                        >
                          {p.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {blendPresetId && (
                  <>
                    {/* Crossfader */}
                    <div className="flex items-center justify-between">
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '10px',
                          color: preset.dot,
                          fontWeight: 700,
                        }}
                      >
                        {preset.name}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '10px',
                          color: '#8A6A4A',
                          opacity: 0.6,
                        }}
                      >
                        {Math.round(blend * 100)}%
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '10px',
                          color: blendPreset?.dot ?? '#9B6BA0',
                          fontWeight: 700,
                        }}
                      >
                        {blendPreset?.name}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(blend * 100)}
                      onChange={(e) => setBlend(Number(e.target.value) / 100)}
                      className="w-full cursor-pointer groove-rainbow-slider"
                      aria-label="Blend between A and B preset"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setBlend(0);
                        setBlendPresetId(null);
                      }}
                      className="w-full cursor-pointer rounded-xl py-1.5 transition-all hover:opacity-85"
                      style={{
                        background: 'transparent',
                        border: '1px solid #C4A06040',
                        color: '#8A6A4A',
                        fontFamily: 'var(--font-serif)',
                        fontSize: '11px',
                      }}
                    >
                      clear blend
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Future-sharing hint */}
          <p
            className="px-2 text-center italic"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '11px',
              color: '#8A6A4A',
              opacity: 0.55,
              lineHeight: 1.5,
            }}
          >
            Coming: share a Circle so friends each hold one switch — you make the vibe together.
          </p>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-xl py-3 transition-all"
      style={{
        background: active ? `${color}25` : 'transparent',
        border: `1.5px solid ${active ? color : `${color}30`}`,
        color: active ? color : '#5C3018',
        fontFamily: 'var(--font-serif)',
        fontSize: '13px',
        fontWeight: active ? 700 : 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
