'use client';

import { useCompletion } from '@ai-sdk/react';
import { useEffect, useState } from 'react';
import LifeTimeline from '@/components/LifeTimeline';
import PersonalityMap from '@/components/PersonalityMap';
import SoulMap from '@/components/SoulMap';
import { getEmotionalWord } from '@/lib/emotional-vocabulary';

// ============================================================
// TONE SYSTEM — 5 narrative voices
// ============================================================

const TONES = [
  {
    id: 'cowboy',
    label: 'Cowboy',
    icon: 'C',
    color: '#C88820',
    desc: 'Straight talk. Dusty wisdom. No sugar.',
    catName: 'The Cowboy',
    catRole: 'your companion on the trail',
    voiceHint:
      'Speak like a wise cowboy — laconic, honest, earthy metaphors. Short sentences. "Reckon you been riding hard this week."',
  },
  {
    id: 'warrior',
    label: 'Warrior',
    icon: 'W',
    color: '#D4605A',
    desc: 'Discipline. Honor. Face the battle.',
    catName: 'The Warrior',
    catRole: 'your companion in the arena',
    voiceHint:
      'Speak like a warrior mentor — direct, disciplined, respectful. Martial metaphors. "The blade is sharpened in the forge of difficulty."',
  },
  {
    id: 'princess',
    label: 'Princess',
    icon: 'P',
    color: '#9B6BA0',
    desc: 'Grace. Inner kingdom. Gentle power.',
    catName: 'The Guide',
    catRole: 'your companion in the kingdom',
    voiceHint:
      'Speak with grace and warmth — poetic, nurturing, empowering. Royal metaphors. "Your kingdom within is vast. Today you tended its gardens."',
  },
  {
    id: 'mythic',
    label: 'Mythologic',
    icon: 'M',
    color: '#3A8AC4',
    desc: 'Ancient stories. Symbols. The deep.',
    catName: 'The Oracle',
    catRole: 'your companion in the deep',
    voiceHint:
      'Speak like a mythic oracle — symbolic, archetypal, layered. Use myth metaphors. "The hero descends before ascending. You are in the cave now."',
  },
  {
    id: 'practical',
    label: 'Practical',
    icon: 'L',
    color: '#7A8A50',
    desc: 'Data. Patterns. Clear logic.',
    catName: 'The Analyst',
    catRole: 'your companion in the data',
    voiceHint:
      'Speak practically — data-driven, clear, structured. No metaphors. "Your emotional average dropped 15 points this week. The pattern correlates with reduced physical activity."',
  },
] as const;

type ToneId = (typeof TONES)[number]['id'];

// ============================================================
// ARCHETYPE SYSTEM
// ============================================================

interface ArchetypeData {
  main: { id: string; name: string; desc: string; color: string };
  inner: { category: string; archetype: string; color: string; strength: number }[];
}

const MAIN_ARCHETYPES = [
  {
    id: 'artist',
    name: 'The Artist',
    desc: 'Feeling everything deeply. Your range is your instrument. Chaos is your canvas — beauty emerges from the mess.',
    color: '#9B6BA0',
    trigger: 'creative',
  },
  {
    id: 'architect',
    name: 'The Architect',
    desc: 'Building order from chaos. Every system is a choice. You design the structure that holds your life together.',
    color: '#C88820',
    trigger: 'structure',
  },
  {
    id: 'psychologist',
    name: 'The Psychologist',
    desc: 'Understanding the patterns beneath. Your mind is your laboratory. Self-knowledge is power — and compassion.',
    color: '#3A8AC4',
    trigger: 'confusion',
  },
  {
    id: 'warrior',
    name: 'The Warrior',
    desc: 'Facing what others avoid. Courage is not the absence of fear — it is the step forward despite it.',
    color: '#D4605A',
    trigger: 'courage',
  },
  {
    id: 'alchemist',
    name: 'The Alchemist',
    desc: 'Turning lead into gold. Your wounds become wisdom. Every low point is raw material for transformation.',
    color: '#7AAA58',
    trigger: 'gratitude',
  },
];

const INNER_ARCHETYPES: Record<string, { id: string; name: string; color: string }[]> = {
  Feeling: [
    { id: 'observer', name: 'The Observer', color: '#9B6BA0' },
    { id: 'empath', name: 'The Empath', color: '#3A8AC4' },
    { id: 'stoic', name: 'The Stoic', color: '#5A7A8A' },
    { id: 'phoenix', name: 'The Phoenix', color: '#D4605A' },
  ],
  Doing: [
    { id: 'architect', name: 'The Architect', color: '#C88820' },
    { id: 'explorer', name: 'The Explorer', color: '#E0844A' },
    { id: 'monk', name: 'The Monk', color: '#7A8A50' },
    { id: 'rebel', name: 'The Rebel', color: '#D45050' },
  ],
  Sharing: [
    { id: 'anchor', name: 'The Anchor', color: '#3AA8A0' },
    { id: 'mirror', name: 'The Mirror', color: '#9B6BA0' },
    { id: 'torch', name: 'The Torch', color: '#E0844A' },
    { id: 'lone_wolf', name: 'The Lone Wolf', color: '#5A7A8A' },
  ],
};

function computeArchetype(checkIns: CheckIn[], answers: Record<string, string>): ArchetypeData {
  const fears = (answers.block_fears_list || '').split('|||').filter(Boolean);
  const strengths = (answers.flow_strengths_list || '').split('|||').filter(Boolean);

  // Count emotional patterns
  const avgSlider =
    checkIns.length > 0 ? checkIns.reduce((s, ci) => s + ci.sliderValue, 0) / checkIns.length : 50;
  const hasConfusion = checkIns.some((ci) => ci.note?.includes('[Confusion]'));
  const hasGratitude = checkIns.some((ci) => ci.note?.includes('[Gratitude]'));
  const hasFear = checkIns.some((ci) => ci.note?.includes('[Fear]'));
  const hasCourage = avgSlider > 55;
  const hasCreative = checkIns.some((ci) => ci.tags?.includes('Creative'));

  // Score each archetype
  const scores: Record<string, number> = {
    artist: (hasCreative ? 3 : 0) + (checkIns.length > 5 ? 2 : 0),
    architect: (avgSlider > 50 ? 2 : 0) + (strengths.length > 2 ? 2 : 0),
    psychologist: (hasConfusion ? 3 : 0) + (fears.length > 2 ? 2 : 0) + (hasFear ? 1 : 0),
    warrior: (hasCourage ? 3 : 0) + (fears.length > 0 && avgSlider > 50 ? 2 : 0),
    alchemist: (hasGratitude ? 3 : 0) + (hasFear ? 2 : 0),
  };

  const mainId = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'artist';
  const main = MAIN_ARCHETYPES.find((a) => a.id === mainId) || MAIN_ARCHETYPES[0];

  // Inner archetypes — semi-random based on data patterns
  const inner = Object.entries(INNER_ARCHETYPES).map(([category, archetypes]) => {
    let idx = 0;
    if (category === 'Feeling') idx = avgSlider > 60 ? 1 : avgSlider < 40 ? 3 : hasFear ? 0 : 2;
    if (category === 'Doing')
      idx = strengths.length > 3 ? 0 : hasCreative ? 1 : avgSlider > 50 ? 2 : 3;
    if (category === 'Sharing') idx = hasGratitude ? 0 : checkIns.length > 10 ? 2 : hasFear ? 3 : 1;
    const arch = archetypes[idx % archetypes.length];
    return {
      category,
      archetype: arch.name,
      color: arch.color,
      strength: Math.min(100, 40 + scores[mainId] * 10),
    };
  });

  return { main, inner };
}

// ============================================================
// TYPES
// ============================================================

interface CheckIn {
  id: string;
  sliderValue: number;
  note: string | null;
  tags: string[] | null;
  emotionName: string | null;
  emotionColor: string | null;
  createdAt: string;
}

// ============================================================
// DARK PERIOD PROGRAM — with memory
// ============================================================

interface DarkPeriodEntry {
  date: string;
  darkness: string;
  trigger: string;
  recurrence: string;
  helps: string;
  need: string;
}

const DARK_STORAGE = 'colourmap:dark-periods';

function loadDarkHistory(): DarkPeriodEntry[] {
  try {
    const saved = localStorage.getItem(DARK_STORAGE);
    if (saved) return JSON.parse(saved);
  } catch { /* */ }
  return [];
}

function DarkPeriodCard({
  tone,
  onReflect,
}: {
  tone: (typeof TONES)[number];
  onReflect: (q: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showHeavens, setShowHeavens] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<DarkPeriodEntry[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHistory(loadDarkHistory());
  }, []);

  const questions = [
    { key: 'darkness', label: 'How dark does it feel right now?', levels: ['Shadow', 'Heavy', 'Fog', 'Storm', 'Abyss'] },
    { key: 'trigger', label: 'What triggered this?', placeholder: 'Name it...' },
    { key: 'recurrence', label: 'Have you been here before?', levels: ['First time', 'Sometimes', 'Often', 'Cycle'] },
    { key: 'helps', label: 'What has helped before?', placeholder: 'Even small things...' },
    { key: 'need', label: 'What do you need right now?', placeholder: 'One thing...' },
  ];

  function saveEntry() {
    const entry: DarkPeriodEntry = {
      date: new Date().toISOString(),
      darkness: answers.darkness || '',
      trigger: answers.trigger || '',
      recurrence: answers.recurrence || '',
      helps: answers.helps || '',
      need: answers.need || '',
    };
    const updated = [entry, ...history].slice(0, 50);
    setHistory(updated);
    localStorage.setItem(DARK_STORAGE, JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Extract wisdom from history
  const pastHelps = [...new Set(history.map((h) => h.helps).filter(Boolean))];
  const pastTriggers = [...new Set(history.map((h) => h.trigger).filter(Boolean))];
  const darkPeriodCount = history.length;

  return (
    <div className="rounded-2xl border border-border/50 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors hover:bg-card/50">
        <div className="h-3 w-3 rounded-full" style={{ background: '#D4605A', opacity: 0.4 }} />
        <span className="text-sm font-serif" style={{ color: '#D4605A80' }}>
          {open ? 'Logbook — facing the dark' : 'Logbook'}
        </span>
        {darkPeriodCount > 0 && !open && (
          <span className="text-[9px] text-muted-foreground/30 ml-auto">
            {darkPeriodCount} past {darkPeriodCount === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 animate-in fade-in duration-200">
          {/* Past wisdom — "The Heavens" view */}
          {history.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowHeavens(!showHeavens)}
                className="w-full flex items-center gap-2 py-2 transition-colors"
                style={{ color: '#3A8AC480' }}>
                <div className="h-2 w-2 rotate-45 rounded-[1px]" style={{ background: '#3A8AC4', opacity: 0.3 }} />
                <span className="text-[11px] font-serif">
                  {showHeavens ? 'The view from above' : 'Look up — you have been here before'}
                </span>
              </button>
              {showHeavens && (
                <div className="space-y-3 pt-1 animate-in fade-in duration-300">
                  {/* What helped before */}
                  {pastHelps.length > 0 && (
                    <div className="rounded-xl p-3" style={{ background: '#3A8AC406', border: '1px solid #3A8AC415' }}>
                      <p className="text-[10px] font-medium mb-2" style={{ color: '#3A8AC490' }}>
                        What brought you back before
                      </p>
                      <div className="space-y-1">
                        {pastHelps.slice(0, 5).map((help, i) => (
                          <p key={i} className="text-xs leading-relaxed" style={{ color: '#3A8AC4aa' }}>
                            {help}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pattern recognition */}
                  {pastTriggers.length > 1 && (
                    <div className="rounded-xl p-3" style={{ background: '#9B6BA006', border: '1px solid #9B6BA015' }}>
                      <p className="text-[10px] font-medium mb-2" style={{ color: '#9B6BA090' }}>
                        What has triggered this before
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {pastTriggers.slice(0, 6).map((trigger, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-lg text-[10px]"
                            style={{ background: '#9B6BA010', color: '#9B6BA0', border: '1px solid #9B6BA020' }}>
                            {trigger}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium" style={{ color: '#5C301840' }}>
                      Your history — {darkPeriodCount} dark {darkPeriodCount === 1 ? 'period' : 'periods'}, and you came back every time
                    </p>
                    <div className="flex gap-1">
                      {history.slice(0, 12).map((entry, i) => {
                        const level = ['Shadow', 'Heavy', 'Fog', 'Storm', 'Abyss'].indexOf(entry.darkness);
                        const opacity = 0.2 + (level / 4) * 0.6;
                        return (
                          <div key={i} className="h-3 flex-1 rounded-sm" style={{ background: '#D4605A', opacity }}
                            title={`${new Date(entry.date).toLocaleDateString()} — ${entry.darkness}`} />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Current dark period questions */}
          {questions.map((q) => (
            <div key={q.key} className="space-y-1.5">
              <p className="text-[11px] font-medium" style={{ color: '#D4605A90' }}>{q.label}</p>
              {q.levels ? (
                <div className="flex gap-1.5">
                  {q.levels.map((level) => (
                    <button key={level} type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.key]: level }))}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all"
                      style={{
                        background: answers[q.key] === level ? '#D4605A18' : '#D4605A06',
                        color: answers[q.key] === level ? '#D4605A' : '#D4605A50',
                        border: `1px solid ${answers[q.key] === level ? '#D4605A35' : '#D4605A10'}`,
                      }}>
                      {level}
                    </button>
                  ))}
                </div>
              ) : (
                <input type="text" value={answers[q.key] || ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
                  placeholder={q.placeholder}
                  className="w-full rounded-lg border border-[#D4605A15] bg-[#D4605A03] px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/30" />
              )}
            </div>
          ))}

          {/* Actions */}
          {Object.keys(answers).length >= 3 && (
            <div className="flex gap-2">
              <button type="button" onClick={() => {
                saveEntry();
                const summary = Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join('\n');
                const historyContext = pastHelps.length > 0
                  ? `\n\nWhat has helped them before: ${pastHelps.join(', ')}`
                  : '';
                const patternContext = pastTriggers.length > 1
                  ? `\n\nPast triggers: ${pastTriggers.join(', ')}`
                  : '';
                onReflect(`The user is going through a difficult time. Here is what they shared:\n${summary}${historyContext}${patternContext}\n\nThis is dark period #${darkPeriodCount + 1}. Help them find their way back to the light. Acknowledge the darkness. If they have past wisdom, remind them of it gently. Be warm, not clinical.`);
              }}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: '#D4605A15', color: '#D4605A', border: '1px solid #D4605A25' }}>
                Talk to {tone.catName}
              </button>
              {!saved && (
                <button type="button" onClick={saveEntry}
                  className="px-3 py-2 rounded-xl text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors border border-border/30">
                  Save
                </button>
              )}
              {saved && (
                <span className="px-3 py-2 text-[10px]" style={{ color: '#7AAA58' }}>Saved</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// CAT COMPANION
// ============================================================

function CatCompanion({ tone, prompt }: { tone: (typeof TONES)[number]; prompt: string | null }) {
  const { completion, complete, isLoading } = useCompletion({
    api: '/api/journey/reflect',
  });

  useEffect(() => {
    if (prompt) {
      complete('', { body: { prompt, tone: tone.id } });
    }
  }, [prompt, tone.id, complete]);

  if (!prompt && !completion) return null;

  return (
    <div
      className="rounded-2xl border border-border/50 px-4 py-4 space-y-3 animate-in fade-in duration-300"
      style={{ background: `${tone.color}05`, borderColor: `${tone.color}20` }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-5 w-5 items-center justify-center rotate-45 rounded-[2px] text-[9px] font-bold -rotate-0"
          style={{ background: `${tone.color}20`, color: tone.color }}
        >
          {tone.icon}
        </span>
        <span className="text-[11px] font-semibold" style={{ color: tone.color }}>
          {tone.catName}
        </span>
        <span className="text-[9px] text-muted-foreground/40">— {tone.catRole}</span>
      </div>
      {isLoading && !completion && (
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: tone.color, opacity: 0.3, animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      )}
      {completion && (
        <p className="text-sm leading-relaxed" style={{ color: `${tone.color}cc` }}>
          {completion}
        </p>
      )}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function JourneyPage() {
  const [tone, setTone] = useState<ToneId>('cowboy');
  const [tonePickerOpen, setTonePickerOpen] = useState(false);
  const [archetypePickerOpen, setArchetypePickerOpen] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [chapterTitle, setChapterTitle] = useState('');
  const [editingChapter, setEditingChapter] = useState(false);
  const [catPrompt, setCatPrompt] = useState<string | null>(null);

  // Load tone from storage
  useEffect(() => {
    const saved = localStorage.getItem('colourmap-journey-tone') as ToneId | null;
    if (saved && TONES.some((t) => t.id === saved)) setTone(saved);
  }, []);

  // Fetch data
  useEffect(() => {
    Promise.all([
      fetch('/api/check-ins').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/life-scan-answers').then((r) => (r.ok ? r.json() : { answers: {} })),
    ])
      .then(([ciData, scanData]) => {
        setCheckIns(Array.isArray(ciData) ? ciData : []);
        setAnswers(scanData.answers || {});
        setChapterTitle(scanData.answers?.chapter_title || '');
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function selectTone(id: ToneId) {
    setTone(id);
    localStorage.setItem('colourmap-journey-tone', id);
  }

  const activeTone = TONES.find((t) => t.id === tone) || TONES[0];
  const suggestedArchetype = loaded ? computeArchetype(checkIns, answers) : null;
  const [chosenArchetypeId, setChosenArchetypeId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('colourmap-journey-archetype');
    if (saved) setChosenArchetypeId(saved);
  }, []);

  const archetype = (() => {
    if (!suggestedArchetype) return null;
    if (!chosenArchetypeId) return suggestedArchetype;
    const chosen = MAIN_ARCHETYPES.find((a) => a.id === chosenArchetypeId);
    if (!chosen) return suggestedArchetype;
    return { ...suggestedArchetype, main: chosen };
  })();

  // Chapter save
  function saveChapter(title: string) {
    setChapterTitle(title);
    setEditingChapter(false);
    fetch('/api/life-scan-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { chapter_title: title } }),
    });
  }

  // Emotion stats
  const recentCheckIns = checkIns.slice(0, 20);
  const avgSlider =
    recentCheckIns.length > 0
      ? Math.round(recentCheckIns.reduce((s, ci) => s + ci.sliderValue, 0) / recentCheckIns.length)
      : 50;
  const emotionalWord = getEmotionalWord(avgSlider);

  if (!loaded) {
    return (
      <main className="mx-auto max-w-lg py-10">
        <div className="h-8 w-32 mx-auto rounded bg-muted animate-pulse" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg space-y-8">
      {/* Title */}
      <p
        className="text-center text-[15px] font-normal tracking-[0.08em] font-serif"
        style={{ color: '#5C3018' }}
      >
        Journey
      </p>

      {/* ========== TONE SELECTOR — collapsible ========== */}
      {(() => {
        const [toneOpen, setToneOpen] = [tonePickerOpen, setTonePickerOpen];
        return (
          <div className="flex justify-center">
            {!toneOpen ? (
              <button type="button" onClick={() => setToneOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
                style={{ background: `${activeTone.color}08`, border: `1px solid ${activeTone.color}15` }}>
                <span className="flex h-4 w-4 items-center justify-center rotate-45 rounded-[1.5px] text-[7px] font-bold"
                  style={{ background: `${activeTone.color}25`, color: activeTone.color }}>
                  <span className="-rotate-45">{activeTone.icon}</span>
                </span>
                <span className="text-[10px] font-medium" style={{ color: `${activeTone.color}80` }}>{activeTone.label}</span>
              </button>
            ) : (
              <div className="space-y-2 animate-in fade-in duration-150">
                <div className="flex justify-center gap-2">
                  {TONES.map((t) => {
                    const isActive = tone === t.id;
                    return (
                      <button key={t.id} type="button"
                        onClick={() => { selectTone(t.id); setToneOpen(false); }}
                        className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all"
                        style={{ background: isActive ? `${t.color}15` : 'transparent', border: `1.5px solid ${isActive ? t.color : `${t.color}15`}` }}>
                        <span className="flex h-5 w-5 items-center justify-center rotate-45 rounded-[2px] text-[8px] font-bold"
                          style={{ background: isActive ? `${t.color}25` : `${t.color}10`, color: isActive ? t.color : `${t.color}50` }}>
                          <span className="-rotate-45">{t.icon}</span>
                        </span>
                        <span className="text-[8px] font-medium" style={{ color: isActive ? t.color : `${t.color}50` }}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" onClick={() => setToneOpen(false)}
                  className="w-full text-[9px] text-muted-foreground/30 text-center">close</button>
              </div>
            )}
          </div>
        );
      })()}

      {/* ========== CHAPTER + ARCHETYPE (compact) ========== */}
      {archetype && (
        <div className="space-y-4">
          {/* Chapter — clean, centered */}
          <div className="text-center">
            {editingChapter ? (
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                onBlur={() => saveChapter(chapterTitle)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveChapter(chapterTitle); }}
                className="text-center text-lg bg-transparent outline-none border-b font-serif w-full"
                style={{ color: activeTone.color, borderColor: `${activeTone.color}30` }}
                placeholder="Name this chapter..."
                autoFocus
              />
            ) : (
              <button type="button" onClick={() => setEditingChapter(true)}
                className="text-lg font-serif transition-colors hover:opacity-70"
                style={{ color: activeTone.color }}>
                {chapterTitle || 'Untitled chapter'}
              </button>
            )}
          </div>

          {/* Archetype — single card, tap to expand choices */}
          {(() => {
            const [showPicker, setShowPicker] = [archetypePickerOpen, setArchetypePickerOpen];
            return (
              <div className="space-y-3">
                <button type="button" onClick={() => setShowPicker(!showPicker)}
                  className="w-full rounded-2xl border p-5 text-center space-y-2 transition-all"
                  style={{ borderColor: `${archetype.main.color}25`, background: `${archetype.main.color}06` }}>
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-8 w-8 flex items-center justify-center rotate-45 rounded-[3px]"
                      style={{ background: `${archetype.main.color}30` }}>
                      <span className="-rotate-45 text-sm font-bold" style={{ color: archetype.main.color }}>
                        {archetype.main.name.split(' ')[1][0]}
                      </span>
                    </div>
                    <p className="text-xl font-serif" style={{ color: archetype.main.color }}>
                      {archetype.main.name}
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: `${archetype.main.color}80` }}>
                    {archetype.main.desc}
                  </p>
                </button>

                {/* Picker — only when expanded */}
                {showPicker && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-5 gap-2">
                      {MAIN_ARCHETYPES.map((a) => {
                        const isActive = archetype.main.id === a.id;
                        return (
                          <button key={a.id} type="button"
                            onClick={() => {
                              setChosenArchetypeId(a.id);
                              localStorage.setItem('colourmap-journey-archetype', a.id);
                              setShowPicker(false);
                            }}
                            className="flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all"
                            style={{
                              background: isActive ? `${a.color}15` : 'transparent',
                              border: `1.5px solid ${isActive ? a.color : `${a.color}12`}`,
                            }}>
                            <div className="h-6 w-6 flex items-center justify-center rotate-45 rounded-[2px]"
                              style={{ background: isActive ? `${a.color}30` : `${a.color}10` }}>
                              <span className="-rotate-45 text-[10px] font-bold" style={{ color: isActive ? a.color : `${a.color}50` }}>
                                {a.name.split(' ')[1][0]}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium" style={{ color: isActive ? a.color : `${a.color}50` }}>
                              {a.name.split(' ')[1]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button type="button" onClick={() => setShowPicker(false)}
                      className="w-full text-[10px] text-muted-foreground/30 text-center py-1">close</button>
                  </div>
                )}

                {/* Inner archetypes — compact row */}
                <div className="flex gap-2 justify-center">
                  {archetype.inner.map((inner) => (
                    <div key={inner.category} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                      style={{ background: `${inner.color}08` }}>
                      <div className="h-2 w-2 rounded-full" style={{ background: inner.color, opacity: 0.6 }} />
                      <span className="text-[10px]" style={{ color: `${inner.color}80` }}>
                        {inner.category}: <span className="font-medium" style={{ color: inner.color }}>{inner.archetype.replace('The ', '')}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========== SOUL MAP ========== */}
      <div className="space-y-2">
        <p className="text-[10px] text-center text-muted-foreground/40 uppercase tracking-widest">
          Your inner terrain
        </p>
        <SoulMap
          data={{
            avgSlider,
            recentEmotions: recentCheckIns.slice(0, 5).map((ci) => ({
              word: ci.emotionName || getEmotionalWord(ci.sliderValue),
              value: ci.sliderValue,
              time: ci.createdAt,
            })),
            fears: (answers.block_fears_list || '').split('|||').filter(Boolean),
            strengths: (answers.flow_strengths_list || '').split('|||').filter(Boolean),
            weaknesses: (answers.block_weak_list || '').split('|||').filter(Boolean),
            energy: (answers.flow_energy_list || '').split('|||').filter(Boolean),
            vision: (answers.vision_where || '').trim(),
            fearCount: recentCheckIns.filter((ci) => ci.note?.includes('[Fear]')).length,
            gratitudeCount: recentCheckIns.filter((ci) => ci.note?.includes('[Gratitude]')).length,
            avoidanceCount: recentCheckIns.filter((ci) => ci.note?.includes('[Avoidance]')).length,
            confusionCount: recentCheckIns.filter((ci) => ci.note?.includes('[Confusion]')).length,
            body: 50,
            attitude: 50,
            structure: 50,
            activeMissions: 0,
            completedMissions: 0,
            archetype: archetype?.main.name || 'The Seeker',
            chapter: chapterTitle,
          }}
          onSelectTerritory={(id) => setSelectedTerritory(selectedTerritory === id ? null : id)}
        />
        {/* Territory detail panel */}
        {selectedTerritory && (() => {
          const TERRITORY_INFO: Record<string, { color: string; question: string; placeholder: string }> = {
            emotions: { color: '#9B6BA0', question: 'What are you feeling right now?', placeholder: 'Name it...' },
            strengths: { color: '#7A8A50', question: 'What strength do you want to develop?', placeholder: 'Name a strength...' },
            fears: { color: '#D45050', question: 'What are you afraid of?', placeholder: 'Name the fear...' },
            vision: { color: '#3AA8A0', question: 'Where are you heading?', placeholder: 'Describe your direction...' },
            energy: { color: '#E0844A', question: 'What gives you energy?', placeholder: 'What charges you...' },
            body: { color: '#D4605A', question: 'How does your body feel?', placeholder: 'Check in with your body...' },
            shadows: { color: '#5A7A8A', question: 'What are you avoiding?', placeholder: 'What hides in the shadows...' },
            gratitude: { color: '#7AAA58', question: 'What are you grateful for?', placeholder: 'Name it...' },
          };
          const info = TERRITORY_INFO[selectedTerritory];
          if (!info) return null;
          return (
            <div className="rounded-xl border p-4 space-y-2 animate-in fade-in duration-150"
              style={{ borderColor: `${info.color}30`, background: `${info.color}05` }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium" style={{ color: info.color }}>
                  {selectedTerritory.charAt(0).toUpperCase() + selectedTerritory.slice(1)}
                </p>
                <button type="button" onClick={() => setSelectedTerritory(null)}
                  className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground">x</button>
              </div>
              <p className="text-[11px]" style={{ color: `${info.color}80` }}>{info.question}</p>
              <input type="text" placeholder={info.placeholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                    const val = (e.target as HTMLInputElement).value.trim();
                    const key = selectedTerritory === 'fears' ? 'block_fears_list'
                      : selectedTerritory === 'strengths' ? 'flow_strengths_list'
                      : selectedTerritory === 'energy' ? 'flow_energy_list'
                      : selectedTerritory === 'vision' ? 'vision_where' : '';
                    if (key) {
                      const current = answers[key] || '';
                      const updated = key === 'vision_where' ? val : (current ? `${current}|||${val}` : val);
                      setAnswers((prev) => ({ ...prev, [key]: updated }));
                      fetch('/api/life-scan-answers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ answers: { [key]: updated } }),
                      });
                    }
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/30"
                style={{ borderColor: `${info.color}15`, background: `${info.color}03` }} />
            </div>
          );
        })()}
      </div>

      {/* ========== PERSONALITY MAP ========== */}
      <div className="space-y-2">
        <p className="text-[10px] text-center text-muted-foreground/40 uppercase tracking-widest">Your inner parts</p>
        <PersonalityMap />
      </div>

      {/* ========== LIFE TIMELINE ========== */}
      <LifeTimeline />

      {/* Divider */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex-1 h-px" style={{ background: `${activeTone.color}15` }} />
        <div
          className="h-3.5 w-3.5 rotate-45 rounded-[1.5px]"
          style={{ background: activeTone.color, opacity: 0.5 }}
        />
        <div className="flex-1 h-px" style={{ background: `${activeTone.color}15` }} />
      </div>

      {/* ========== CAT COMPANION ========== */}
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2">
          <span
            className="flex h-5 w-5 items-center justify-center rotate-45 rounded-[2px] text-[9px] font-bold"
            style={{ background: `${activeTone.color}20`, color: activeTone.color }}
          >
            <span className="-rotate-45">{activeTone.icon}</span>
          </span>
          <p className="text-[11px] font-medium" style={{ color: activeTone.color }}>
            {activeTone.catName} says...
          </p>
        </div>
        {/* Quick reflect button */}
        {!catPrompt && (
          <button
            type="button"
            onClick={() => {
              const summary = [
                `Emotional center: ${emotionalWord} (${avgSlider}/100)`,
                archetype ? `Archetype: ${archetype.main.name}` : '',
                chapterTitle ? `Chapter: ${chapterTitle}` : '',
                `Recent check-ins: ${recentCheckIns.length}`,
              ]
                .filter(Boolean)
                .join('\n');
              setCatPrompt(summary);
            }}
            className="w-full py-2.5 rounded-xl text-sm transition-all"
            style={{
              background: `${activeTone.color}08`,
              color: `${activeTone.color}80`,
              border: `1px solid ${activeTone.color}15`,
            }}
          >
            Reflect on my journey
          </button>
        )}
        <CatCompanion tone={activeTone} prompt={catPrompt} />
      </div>

      {/* ========== DARK PERIOD ========== */}
      <DarkPeriodCard
        tone={activeTone}
        onReflect={(summary) => {
          setCatPrompt(
            `The user is going through a difficult time. Here's what they shared:\n${summary}\n\nHelp them find their way back to the light. Be warm, not clinical. Acknowledge the darkness without minimizing it.`,
          );
        }}
      />
    </main>
  );
}
