'use client';

import { useCallback, useState } from 'react';
import { useCheckIn } from '@/components/CheckInContext';
import PostCheckInInsight from '@/components/PostCheckInInsight';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getEmotionalWord } from '@/lib/emotional-vocabulary';

const HAWKINS = [
  {
    level: 'Shame',
    color: '#C83030',
    desc: 'You believe you are fundamentally flawed. To move: separate what you did from who you are. One small act of self-compassion today.',
  },
  {
    level: 'Guilt',
    color: '#D44040',
    desc: 'You believe you did something wrong. To move: acknowledge it, make amends if possible, then let it go. You are not your worst moment.',
  },
  {
    level: 'Grief',
    color: '#D45050',
    desc: 'The weight of loss. To move: let yourself feel it fully without rushing. Grief is the doorway to acceptance.',
  },
  {
    level: 'Fear',
    color: '#D46050',
    desc: 'The world feels threatening. To move: name the fear specifically. Face one small piece of it today. What you avoid grows — what you face shrinks.',
  },
  {
    level: 'Desire',
    color: '#D87048',
    desc: 'Craving and attachment. To move: ask what you really need underneath the wanting. Pause before acting on impulse.',
  },
  {
    level: 'Anger',
    color: '#E0844A',
    desc: "Raw energy from crossed boundaries. To move: channel it — don't suppress, don't explode. Anger is information about what matters to you.",
  },
  {
    level: 'Pride',
    color: '#E0844A',
    desc: "Feels good but fragile — depends on comparison. To move: find worth that doesn't need an audience. True confidence is quiet.",
  },
  {
    level: 'Courage',
    color: '#C88820',
    desc: "The first level of real power. To build: take one action you've been postponing. Courage grows by doing, not thinking.",
  },
  {
    level: 'Willingness',
    color: '#7AAA58',
    desc: 'Open and ready. Resistance has dropped. To build: say yes to something uncomfortable. Your availability for change is your greatest asset.',
  },
  {
    level: 'Acceptance',
    color: '#80C0A0',
    desc: "You've stopped fighting reality. To build: focus on what you can control. Transform complaints into commitments.",
  },
  {
    level: 'Reason',
    color: '#3AA8A0',
    desc: 'Intellect is strong but can become a trap. To build: balance thinking with feeling. Act on what you already know.',
  },
  {
    level: 'Love',
    color: '#3A8AC4',
    desc: 'Unconditional, not attachment. To sustain: nurture without needing anything in return. Extend this love to yourself too.',
  },
  {
    level: 'Joy',
    color: '#7A6AB8',
    desc: 'Inner joy independent of circumstances. To sustain: share it. Joy multiplies when given. Stay grounded.',
  },
  {
    level: 'Peace',
    color: '#9B6BA0',
    desc: 'Complete stillness. Pure awareness. To sustain: protect your silence. Return here through breath whenever the world pulls you away.',
  },
];

import ReflectionMoment from './ReflectionMoment';

const INNER_TRACKERS = [
  {
    id: 'fear',
    label: 'Fear',
    questions: [
      'What are you afraid of today?',
      'What would happen if it came true?',
      "What's one small thing you can face right now?",
    ],
    color: '#D45050',
    logKey: 'overview_Attitude_log',
  },
  {
    id: 'gratitude',
    label: 'Gratitude',
    questions: [
      'What are you grateful for?',
      'Why does it matter to you?',
      'Who made it possible?',
    ],
    color: '#7AAA58',
    logKey: 'overview_Attitude_log',
  },
  {
    id: 'avoidance',
    label: 'Avoidance',
    questions: [
      'What do you keep pushing back?',
      'What happens if you keep avoiding it?',
      "What's the smallest first step?",
    ],
    color: '#E0844A',
    logKey: 'overview_Attitude_log',
  },
  {
    id: 'confusion',
    label: 'Confusion',
    questions: [
      'What feels unclear right now?',
      'What would clarity look like?',
      'Who or what could help you see it?',
    ],
    color: '#9B6BA0',
    logKey: 'overview_Presence_log',
  },
] as const;

const _TAGS = [
  {
    id: 'Work',
    color: '#E0844A',
    left: 'Scattered',
    right: 'Focused',
    question: 'What is blocking your progress?',
  },
  {
    id: 'Body',
    color: '#D4605A',
    left: 'Drained',
    right: 'Energized',
    question: 'What does your body need?',
  },
  {
    id: 'Relationships',
    color: '#3A8AC4',
    left: 'Isolated',
    right: 'Connected',
    question: 'Who do you need to reach out to?',
  },
  {
    id: 'Creative',
    color: '#7A8A50',
    left: 'Blocked',
    right: 'Inspired',
    question: 'What would spark your creativity?',
  },
  {
    id: 'General',
    color: '#9B6BA0',
    left: 'Stuck',
    right: 'Moving',
    question: 'What pattern do you notice?',
  },
] as const;

interface MissionSummary {
  id: string;
  title: string;
}

interface CheckInFormProps {
  missions?: MissionSummary[];
  onCheckInComplete?: () => void;
}

const ENERGY_COLORS = ['#D08040', '#C88C48', '#C49850', '#C4A048', '#A8AC58', '#90B060', '#80B868'];
const ENERGY_LABELS = ['Empty', 'Low', 'Tired', 'OK', 'Good', 'High', 'Peak'];

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function _NoteLog({
  note,
  setNote,
  trackerValues,
  setTrackerValues,
}: {
  note: string;
  setNote: (v: string) => void;
  trackerValues: Record<string, string>;
  setTrackerValues: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
}) {
  const [inputText, setInputText] = useState('');
  const [inputEnergy, setInputEnergy] = useState<number | null>(null);

  // Parse note into lines for display
  const lines = note.split('\n').filter((l) => l.trim());

  function addLine() {
    if (!inputText.trim()) return;
    const time = nowTime();
    const energyPart = inputEnergy !== null ? ` [${ENERGY_LABELS[inputEnergy]}]` : '';
    const newLine = `${time}${energyPart} ${inputText.trim()}`;
    setNote(note ? `${note}\n${newLine}` : newLine);
    setInputText('');
    setInputEnergy(null);
  }

  return (
    <div className="space-y-2">
      {/* Existing entries */}
      {lines.length > 0 && (
        <div className="space-y-1 px-1">
          {lines.map((line, i) => {
            // Parse time and energy from line
            const timeMatch = line.match(/^(\d{2}:\d{2})/);
            const energyMatch = line.match(/\[(Empty|Low|Tired|OK|Good|High|Peak)\]/);
            const energyIdx = energyMatch ? ENERGY_LABELS.indexOf(energyMatch[1]) : -1;
            const cleanText = line
              .replace(/^\d{2}:\d{2}\s*/, '')
              .replace(/\[(Empty|Low|Tired|OK|Good|High|Peak)\]\s*/, '')
              .trim();
            const isTracker =
              line.startsWith('[Fear]') ||
              line.startsWith('[Gratitude]') ||
              line.startsWith('[Avoidance]') ||
              line.startsWith('[Confusion]');
            const trackerInfo = INNER_TRACKERS.find((t) => line.startsWith(`[${t.label}]`));

            return (
              <div key={i} className="flex items-start gap-2 group">
                {timeMatch && (
                  <span className="text-[10px] text-muted-foreground/40 shrink-0 pt-0.5 w-10">
                    {timeMatch[1]}
                  </span>
                )}
                {!timeMatch && !isTracker && <span className="w-10 shrink-0" />}
                {isTracker && trackerInfo && (
                  <span
                    className="text-[10px] shrink-0 pt-0.5"
                    style={{ color: trackerInfo.color }}
                  >
                    {trackerInfo.label}
                  </span>
                )}
                {energyIdx >= 0 && (
                  <div className="flex gap-[2px] shrink-0 pt-1.5">
                    {ENERGY_COLORS.map((c, ci) => (
                      <div
                        key={ci}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 1,
                          background: c,
                          opacity:
                            ci === energyIdx ? 1 : Math.abs(ci - energyIdx) === 1 ? 0.35 : 0.08,
                        }}
                      />
                    ))}
                  </div>
                )}
                <span className={`text-xs flex-1 ${isTracker ? 'text-muted-foreground' : ''}`}>
                  {isTracker ? line.replace(/\[[^\]]+\]\s*/, '') : cleanText || line}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Input row */}
      <div className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/40 shrink-0">{nowTime()}</span>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addLine();
            }}
            placeholder="What's on your mind?"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
          />
        </div>

        {/* Energy + tags row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {ENERGY_COLORS.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInputEnergy(inputEnergy === i ? null : i)}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: c,
                  opacity:
                    inputEnergy === null
                      ? 0.2
                      : i === inputEnergy
                        ? 1
                        : Math.abs(i - inputEnergy) === 1
                          ? 0.35
                          : 0.1,
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.15s',
                }}
              />
            ))}
            {inputEnergy !== null && (
              <span className="text-[9px] ml-1" style={{ color: ENERGY_COLORS[inputEnergy] }}>
                {ENERGY_LABELS[inputEnergy]}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {INNER_TRACKERS.map((t) => {
              const tagged = note.includes(`[${t.label}]`);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (tagged) return;
                    const prefix = `[${t.label}] `;
                    setNote(note ? `${note}\n${prefix}` : prefix);
                  }}
                  className="rounded-full px-2 py-0.5 text-[9px] font-medium transition-all"
                  style={{
                    background: tagged ? `${t.color}18` : 'transparent',
                    color: tagged ? t.color : `${t.color}50`,
                    border: `1px solid ${tagged ? `${t.color}30` : `${t.color}10`}`,
                  }}
                >
                  {t.label[0]}
                  {tagged ? '✓' : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const PULSE_COLORS = ['#D08040', '#C88C48', '#C49850', '#C4A048', '#A8AC58', '#90B060', '#80B868'];

function PulseSlider({
  id,
  label,
  levels,
  value,
  onValue,
  noteValue,
  onNote,
}: {
  id: string;
  label: string;
  levels: readonly string[];
  value: number;
  onValue: (v: number) => void;
  noteValue: string;
  onNote: (v: string) => void;
}) {
  const idx = Math.round((value / 100) * (levels.length - 1));
  const currentColor = PULSE_COLORS[idx];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: currentColor }}
        >
          {label}
        </span>
        <span className="text-[10px]" style={{ color: currentColor }}>
          {levels[idx]}
        </span>
      </div>
      <div className="flex gap-1.5" data-no-drag>
        {PULSE_COLORS.map((c, i) => {
          const isSelected = i === idx;
          const dist = Math.abs(i - idx);
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onValue(Math.round((i / (PULSE_COLORS.length - 1)) * 100));
              }}
              style={{
                width: 20,
                height: 20,
                background: c,
                opacity: isSelected ? 1 : dist === 1 ? 0.5 : 0.2,
                borderRadius: 3,
                transition: 'all 0.2s',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          );
        })}
      </div>
      {noteValue ? (
        <input
          type="text"
          value={noteValue}
          onChange={(e) => onNote(e.target.value)}
          className="w-full bg-transparent text-xs text-muted-foreground outline-none"
          placeholder={`Note on ${label.toLowerCase()}...`}
        />
      ) : (
        <input
          type="text"
          value=""
          onChange={(e) => onNote(e.target.value)}
          className="w-full bg-transparent text-xs text-muted-foreground/30 outline-none placeholder:text-muted-foreground/30"
          placeholder={`Note on ${label.toLowerCase()}...`}
        />
      )}
    </div>
  );
}

export default function CheckInForm({ missions = [], onCheckInComplete }: CheckInFormProps) {
  const checkInCtx = useCheckIn();
  const sliderValue = checkInCtx.sliderValue;
  const setSliderValue = checkInCtx.setSliderValue;
  const barActive = checkInCtx.barActive;
  const setBarActive = checkInCtx.setBarActive;

  const [note, setNote] = useState('');
  const [_challenge, setChallenge] = useState('');
  const [_showChallenge, setShowChallenge] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [_tagSliders, setTagSliders] = useState<Record<string, number>>({});
  const [_tagNotes, setTagNotes] = useState<Record<string, string>>({});
  const [_showTagPicker, _setShowTagPicker] = useState(false);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflectionWord, setReflectionWord] = useState<string | null>(null);
  const [insightCheckInId, setInsightCheckInId] = useState<string | null>(null);
  const [insightColor, setInsightColor] = useState('#C4A060');
  const [showPulse, setShowPulse] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const [openTracker, setOpenTracker] = useState<string | null>(null);
  const [trackerValues, setTrackerValues] = useState<Record<string, string>>({});
  const [pulseDots, setPulseDots] = useState<Record<string, number>>({
    body: 50,
    attitude: 50,
    structure: 50,
  });

  const _emotionalWord = getEmotionalWord(sliderValue);

  function _toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/check-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sliderValue,
          note:
            [
              // Pulse sliders
              ...(['body', 'attitude', 'structure'] as const)
                .filter((id) => pulseDots[id] !== undefined && pulseDots[id] !== 50)
                .map((id) => {
                  const levels: Record<string, readonly string[]> = {
                    body: ['Drained', 'Tired', 'OK', 'Good', 'Strong'],
                    attitude: ['Low', 'Heavy', 'Neutral', 'Solid', 'Powerful'],
                    structure: ['Chaotic', 'Messy', 'OK', 'Organised', 'Dialed in'],
                  };
                  const lvl = levels[id];
                  const idx = Math.round(((pulseDots[id] ?? 50) / 100) * (lvl.length - 1));
                  const pulseNote = trackerValues[`pulse_${id}`]?.trim();
                  return `[${id}: ${lvl[idx]}]${pulseNote ? ` ${pulseNote}` : ''}`;
                }),
              // Inner trackers (FGAC) — all question answers
              ...INNER_TRACKERS.filter((t) => trackerValues[t.id]?.trim()).map((t) => {
                const keys = t.questions.map((_, i) => (i === 0 ? t.id : `${t.id}_${i + 1}`));
                const answers = keys.map((k) => trackerValues[k]?.trim()).filter(Boolean);
                return `[${t.label}] ${answers.join(' → ')}`;
              }),
              note.trim(),
            ]
              .filter(Boolean)
              .join('\n') || null,
          tags: selectedTags.size > 0 ? [...selectedTags] : null,
          missionId: selectedMission,
          emotionName: (() => {
            const activeTracker = INNER_TRACKERS.find(
              (t) => t.id === openTracker && trackerValues[t.id]?.trim(),
            );
            if (activeTracker) return activeTracker.label;
            return barActive
              ? HAWKINS[Math.min(Math.round((sliderValue / 100) * 13), 13)].level
              : null;
          })(),
          emotionColor: (() => {
            const activeTracker = INNER_TRACKERS.find(
              (t) => t.id === openTracker && trackerValues[t.id]?.trim(),
            );
            if (activeTracker) return activeTracker.color;
            return barActive
              ? HAWKINS[Math.min(Math.round((sliderValue / 100) * 13), 13)].color
              : null;
          })(),
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        setError(responseData.error ?? 'Something went wrong');
        return;
      }

      // Save inner tracker entries to overview logs
      const trackerEntries = INNER_TRACKERS.filter((t) => trackerValues[t.id]?.trim());
      if (trackerEntries.length > 0) {
        const logUpdates: Record<string, string[]> = {};
        for (const t of trackerEntries) {
          if (!logUpdates[t.logKey]) logUpdates[t.logKey] = [];
          const keys = t.questions.map((_, i) => (i === 0 ? t.id : `${t.id}_${i + 1}`));
          const answers = keys.map((k) => trackerValues[k]?.trim()).filter(Boolean);
          logUpdates[t.logKey].push(`[${t.label}] ${answers.join(' → ')}`);
        }
        // Fetch existing logs, append, save
        try {
          const existing = await fetch('/api/life-scan-answers').then((r) =>
            r.ok ? r.json() : { answers: {} },
          );
          const answers: Record<string, string> = {};
          for (const [logKey, texts] of Object.entries(logUpdates)) {
            const current: { text: string; date: string }[] = (() => {
              try {
                return JSON.parse(existing.answers?.[logKey] || '[]');
              } catch {
                return [];
              }
            })();
            const now = new Date().toISOString();
            const updated = [...texts.map((text) => ({ text, date: now })), ...current];
            answers[logKey] = JSON.stringify(updated);
          }
          await fetch('/api/life-scan-answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers }),
          });
        } catch {
          /* silent */
        }
      }

      const hawkinsIdx = Math.min(Math.round((sliderValue / 100) * 13), 13);
      setInsightCheckInId(responseData.id);
      setInsightColor(HAWKINS[hawkinsIdx].color);
      const submittedWord = getEmotionalWord(sliderValue);
      setReflectionWord(submittedWord);
    } catch {
      setError('Network error — check your connection');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReflectionDismiss() {
    setReflectionWord(null);
    // Don't reset yet — show AI insight
  }

  const handleInsightDismiss = useCallback(() => {
    setInsightCheckInId(null);
    setShowPulse(false);
    setSliderValue(50);
    setNote('');
    setChallenge('');
    setShowChallenge(false);
    setSelectedTags(new Set());
    setSelectedMission(null);
    setTagSliders({});
    setTagNotes({});
    setBarActive(false);
    setShowDesc(false);
    setOpenTracker(null);
    setTrackerValues({});
    setPulseDots({ body: 50, attitude: 50, structure: 50 });
    checkInCtx.setInsightText(null);
    checkInCtx.setIsLoadingInsight(false);
    onCheckInComplete?.();
  }, [onCheckInComplete, checkInCtx, setBarActive, setSliderValue]);

  if (reflectionWord) {
    return <ReflectionMoment word={reflectionWord} onDismiss={handleReflectionDismiss} />;
  }

  if (insightCheckInId) {
    return (
      <PostCheckInInsight
        checkInId={insightCheckInId}
        emotionColor={insightColor}
        onDismiss={handleInsightDismiss}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hawkins emotion wheel */}
      <div className="space-y-3">
        {(() => {
          const hawkinsIdx = Math.round((sliderValue / 100) * 13);
          const current = HAWKINS[Math.min(hawkinsIdx, 13)];
          return (
            <>
              {/* Emotion name above bar */}
              {barActive && (
                <p
                  className="text-lg font-semibold text-center transition-all duration-300"
                  style={{ color: current.color }}
                >
                  {current.level}
                </p>
              )}

              {/* Hawkins bar */}
              <div
                className="flex gap-[2px] rounded-lg overflow-hidden cursor-pointer"
                data-no-drag
                style={{ touchAction: 'none' }}
                onDragStart={(e) => e.preventDefault()}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setBarActive(true);
                  setShowDesc(false);
                  const r = e.currentTarget.getBoundingClientRect();
                  setSliderValue(Math.round(((e.clientX - r.left) / r.width) * 100));
                }}
                onMouseMove={(e) => {
                  if (e.buttons > 0) {
                    e.stopPropagation();
                    const r = e.currentTarget.getBoundingClientRect();
                    setSliderValue(
                      Math.max(
                        0,
                        Math.min(100, Math.round(((e.clientX - r.left) / r.width) * 100)),
                      ),
                    );
                  }
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setBarActive(true);
                  setShowDesc(false);
                  const r = e.currentTarget.getBoundingClientRect();
                  setSliderValue(Math.round(((e.touches[0].clientX - r.left) / r.width) * 100));
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const r = e.currentTarget.getBoundingClientRect();
                  setSliderValue(
                    Math.max(
                      0,
                      Math.min(100, Math.round(((e.touches[0].clientX - r.left) / r.width) * 100)),
                    ),
                  );
                }}
              >
                {HAWKINS.map((h, i) => {
                  const isSelected = i === hawkinsIdx;
                  const dist = Math.abs(i - hawkinsIdx);
                  return (
                    <div
                      key={h.level}
                      style={{
                        flex: 1,
                        height: 28,
                        background: h.color,
                        opacity: barActive
                          ? isSelected
                            ? 1
                            : dist === 1
                              ? 0.55
                              : 0.2
                          : isSelected
                            ? 0.7
                            : dist === 1
                              ? 0.4
                              : 0.2,
                        borderRadius: i === 0 ? '8px 0 0 8px' : i === 13 ? '0 8px 8px 0' : 0,
                        transition: 'all 0.3s',
                      }}
                    />
                  );
                })}
              </div>

              {/* Description + more below slider */}
              {barActive && (
                <div className="text-center space-y-1">
                  {!showDesc ? (
                    <button
                      type="button"
                      onClick={() => setShowDesc(true)}
                      className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
                    >
                      more
                    </button>
                  ) : (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <p
                        className="text-xs leading-relaxed px-2"
                        style={{ color: current.color, opacity: 0.7 }}
                      >
                        {current.desc}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowDesc(false)}
                        className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors"
                      >
                        less
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </div>

      <Textarea
        id="check-in-note"
        className="border-[#C4A06020] bg-[#C4A06005] focus-visible:border-[#C4A06040] focus-visible:ring-[#C4A06015]"
        placeholder={(() => {
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          if (!barActive) return `${time}  What's on your mind?`;
          const idx = Math.min(Math.round((sliderValue / 100) * 13), 13);
          const prompts: Record<string, string> = {
            Shame: 'What feels heavy?',
            Guilt: "What's weighing on you?",
            Grief: 'What are you letting go of?',
            Fear: 'What feels threatening?',
            Desire: 'What are you craving?',
            Anger: 'What crossed a line?',
            Pride: 'What are you proving?',
            Courage: 'What shifted?',
            Willingness: 'What are you open to?',
            Acceptance: 'What did you let in?',
            Reason: 'What are you figuring out?',
            Love: 'What are you nurturing?',
            Joy: 'What lit you up?',
            Peace: 'What feels still?',
          };
          return `${time}  ${prompts[HAWKINS[idx].level] || "What's on your mind?"}`;
        })()}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#7A5438] text-[#F5DEB8] hover:bg-[#6B4830]"
      >
        {isSubmitting ? 'Saving...' : 'Check in'}
      </Button>

      {/* Pulse (BAS) — collapsible, closed by default */}
      <div>
        <button
          type="button"
          onClick={() => setShowPulse(!showPulse)}
          className="flex items-center justify-center gap-2 w-full py-1 transition-colors"
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: '#5C301850' }}
          >
            Pulse
          </span>
          <span className="text-[9px]" style={{ color: '#5C301830' }}>
            {showPulse ? '−' : '+'}
          </span>
        </button>
        {showPulse && (
          <div className="space-y-2 pt-2 animate-in fade-in duration-150">
            <PulseSlider
              id="body"
              label="Body"
              levels={['Disconnected', 'Drained', 'Tired', 'OK', 'Good', 'Strong', 'Powerful']}
              value={pulseDots.body ?? 50}
              onValue={(v) => setPulseDots((prev) => ({ ...prev, body: v }))}
              noteValue={trackerValues.pulse_body || ''}
              onNote={(v) => setTrackerValues((prev) => ({ ...prev, pulse_body: v }))}
            />
            <PulseSlider
              id="attitude"
              label="Attitude"
              levels={['Wet sock', 'Low', 'Heavy', 'Neutral', 'Solid', 'Strong', 'Unshakable']}
              value={pulseDots.attitude ?? 50}
              onValue={(v) => setPulseDots((prev) => ({ ...prev, attitude: v }))}
              noteValue={trackerValues.pulse_attitude || ''}
              onNote={(v) => setTrackerValues((prev) => ({ ...prev, pulse_attitude: v }))}
            />
            <PulseSlider
              id="structure"
              label="Structure"
              levels={['Chaotic', 'Scattered', 'Messy', 'OK', 'Tidy', 'Organised', 'Laser sharp']}
              value={pulseDots.structure ?? 50}
              onValue={(v) => setPulseDots((prev) => ({ ...prev, structure: v }))}
              noteValue={trackerValues.pulse_structure || ''}
              onNote={(v) => setTrackerValues((prev) => ({ ...prev, pulse_structure: v }))}
            />
          </div>
        )}
      </div>

      {/* Inner trackers (FGAC) — behind losange toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => setOpenTracker(openTracker ? null : INNER_TRACKERS[0].id)}
            className="flex h-4 w-4 items-center justify-center rotate-45 transition-all hover:scale-110"
            style={{
              background: openTracker ? '#C4A060' : '#C4A06035',
              borderRadius: 1.5,
            }}
          >
            <span
              className="text-[7px] leading-none -rotate-45 font-bold"
              style={{ color: openTracker ? '#fff' : '#C4A060' }}
            >
              {openTracker ? '−' : '+'}
            </span>
          </button>
        </div>
        {openTracker && (
          <div className="space-y-2 animate-in fade-in duration-150">
            <div className="flex flex-wrap gap-1.5 justify-center">
              {INNER_TRACKERS.map((t) => {
                const isActive = openTracker === t.id;
                const hasValue = !!trackerValues[t.id]?.trim();
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setOpenTracker(isActive ? null : t.id)}
                    className="rounded-full px-3 py-1 text-[11px] font-medium transition-all"
                    style={{
                      background: isActive
                        ? `${t.color}18`
                        : hasValue
                          ? `${t.color}10`
                          : `${t.color}06`,
                      color: isActive ? t.color : hasValue ? t.color : `${t.color}70`,
                      border: `1px solid ${isActive ? `${t.color}35` : hasValue ? `${t.color}25` : `${t.color}15`}`,
                    }}
                  >
                    {t.label}
                    {hasValue && !isActive ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
            {(() => {
              const t = INNER_TRACKERS.find((t) => t.id === openTracker);
              if (!t) return null;
              const keys = t.questions.map((_, i) => (i === 0 ? t.id : `${t.id}_${i + 1}`));
              // Only show questions that have been explicitly unlocked (key exists in trackerValues)
              const unlockedCount = keys.filter((k) => k in trackerValues).length;
              const visibleCount = Math.max(1, unlockedCount);
              const lastKey = keys[visibleCount - 1];
              const canUnlockNext =
                visibleCount < t.questions.length && trackerValues[lastKey]?.trim();
              return (
                <div className="space-y-1">
                  {t.questions.slice(0, visibleCount).map((q, i) => {
                    const key = keys[i];
                    const showLosange = i < visibleCount - 1;
                    return (
                      <div key={key}>
                        <input
                          type="text"
                          value={trackerValues[key] || ''}
                          onChange={(e) =>
                            setTrackerValues((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder={q}
                          className="w-full rounded-lg border px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/40"
                          style={{ borderColor: `${t.color}25`, background: `${t.color}05` }}
                        />
                        {showLosange && (
                          <div className="flex justify-center py-2">
                            <div
                              className="h-2 w-2 rotate-45 rounded-[1px]"
                              style={{ background: t.color, opacity: 0.2 }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {canUnlockNext && (
                    <div className="flex justify-center py-2">
                      <button
                        type="button"
                        onClick={() =>
                          setTrackerValues((prev) => ({ ...prev, [keys[visibleCount]]: '' }))
                        }
                        className="flex h-3.5 w-3.5 items-center justify-center rotate-45 transition-all hover:scale-125"
                        style={{ background: `${t.color}30`, borderRadius: 1.5 }}
                      >
                        <span
                          className="text-[6px] leading-none -rotate-45 font-bold"
                          style={{ color: t.color }}
                        >
                          +
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </form>
  );
}
