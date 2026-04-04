'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import SegmentPills from './SegmentPills';

import { getEmotionalWord } from '@/lib/emotional-vocabulary';

interface CompassData {
  // Check-in
  latestCheckIn?: { sliderValue: number; note: string | null; createdAt: string } | null;
  todayCheckIns?: { sliderValue: number; createdAt: string }[];
  // Life Scan
  fears?: string[];
  weaknesses?: string[];
  strengths?: string[];
  working?: string[];
  energy?: string[];
  visionText?: string;
  firstMove?: string;
  visionWho?: string;
  // Missions
  missions?: { id: string; title: string; blocking: string | null; completed: boolean }[];
}

const WHEELS = [
  // Order: [right, bottom, left, top] to match X-divided SVG paths
  { id: 'feeling', name: 'Feeling', segments: ['Presence', 'Body', 'Emotions', 'Attitude'], colors: ['#A8C8A0', '#8AB888'] },
  { id: 'doing', name: 'Doing', segments: ['Structure', 'Action', 'Resources', 'Direction'], colors: ['#E8C898', '#D4B078'] },
  { id: 'sharing', name: 'Sharing', segments: ['Love', 'Friends', 'Network', 'Family'], colors: ['#A8C8E0', '#90B0D0'] },
];

function getDotColor(v: number) { return v <= 20 ? '#D4605A' : v <= 40 ? '#E0844A' : v <= 60 ? '#C88820' : v <= 80 ? '#7A8A50' : '#4AB87A'; }
function formatTime(d: string) { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

interface SliderDef {
  key: string;
  levels: { label: string; color: string }[];
}

interface DoingQuestion {
  key: string; // e.g. 'direction'
  label: string;
  placeholder: string;
}

interface SegmentContent {
  title: string;
  status?: string;
  dataItems?: string[];
  question: string;
  actions: string[];
  link?: string;
  linkLabel?: string;
  slider?: SliderDef;
  doingQuestions?: DoingQuestion[];
  wisdom?: string;
  hasWeaknessMap?: boolean;
}

const HAWKINS_SLIDER: SliderDef = {
  key: 'overview_hawkins',
  levels: [
    { label: 'Shame', color: '#C83030' },
    { label: 'Guilt', color: '#D44040' },
    { label: 'Grief', color: '#D45050' },
    { label: 'Fear', color: '#D46050' },
    { label: 'Desire', color: '#D87048' },
    { label: 'Anger', color: '#E0844A' },
    { label: 'Pride', color: '#E0844A' },
    { label: 'Courage', color: '#C88820' },
    { label: 'Willingness', color: '#7AAA58' },
    { label: 'Acceptance', color: '#80C0A0' },
    { label: 'Reason', color: '#3AA8A0' },
    { label: 'Love', color: '#3A8AC4' },
    { label: 'Joy', color: '#7A6AB8' },
    { label: 'Peace', color: '#9B6BA0' },
  ],
};

const PRESENCE_SLIDER: SliderDef = {
  key: 'overview_presence',
  levels: [
    { label: 'Scattered', color: '#C8905A' },
    { label: 'Agitated', color: '#C49460' },
    { label: 'Restless', color: '#C09868' },
    { label: 'Distracted', color: '#B89C70' },
    { label: 'Autopilot', color: '#B0A078' },
    { label: 'Settling', color: '#A0A480' },
    { label: 'Attentive', color: '#90A888' },
    { label: 'Calm', color: '#88AC90' },
    { label: 'Grounded', color: '#80B098' },
    { label: 'Still', color: '#80B0A0' },
    { label: 'Zen', color: '#88A8A8' },
  ],
};

function getSegmentContent(segment: string, data: CompassData): SegmentContent {
  const { latestCheckIn, todayCheckIns, fears, weaknesses, strengths, working, energy, visionText, firstMove, visionWho, missions } = data;
  const activeMissions = missions?.filter(m => !m.completed) || [];
  const blockedMissions = activeMissions.filter(m => m.blocking?.trim());

  switch (segment) {
    case 'Attitude':
      return {
        title: 'Attitude',
        wisdom: 'Attitude is what you build when times get tough. It will help you walk through the storms and overcome the challenges of existence. Your attitude is not what happens to you — it is what you decide to carry.',
        question: '',
        actions: [],
        hasWeaknessMap: true,
        doingQuestions: [
          { key: 'story', label: 'Story', placeholder: 'What is the story you tell yourself?' },
          { key: 'selftalk', label: 'Self Talk', placeholder: 'How can you improve your self talk?' },
          { key: 'notwant', label: 'Shadow', placeholder: 'What do you not want to be?' },
          { key: 'direction', label: 'Direction', placeholder: 'What attitude do you want to carry?' },
          { key: 'resources', label: 'Resources', placeholder: 'What helps you shift your mindset? (people, habits, reminders)' },
          { key: 'structure', label: 'Structure', placeholder: 'What daily practice keeps your attitude in check?' },
          { key: 'action', label: 'Action', placeholder: 'One thing you can do right now to shift your state' },
        ],
      };
    case 'Body':
      return {
        title: 'Body',
        wisdom: 'Your body is the vessel. It carries everything — your dreams, your fears, your power. When you neglect it, everything suffers. When you listen to it, it tells you exactly what you need.',
        question: '',
        actions: [],
        doingQuestions: [
          { key: 'listening', label: 'Listening', placeholder: 'What is your body telling you right now?' },
          { key: 'direction', label: 'Direction', placeholder: 'Where do you want your body to be?' },
          { key: 'resources', label: 'Resources', placeholder: 'What do you already have? (gym, habits, knowledge)' },
          { key: 'structure', label: 'Structure', placeholder: 'What routine supports your body?' },
          { key: 'action', label: 'Action', placeholder: 'One thing to do today for your body' },
        ],
      };
    case 'Emotions': {
      const word = latestCheckIn ? getEmotionalWord(latestCheckIn.sliderValue) : null;
      return {
        title: 'Emotions',
        wisdom: 'Emotions allow you to be human, alive. They connect the body to the mind and require you to listen in order to find the power of your highest transformation. Every emotion is information — not an enemy.',
        status: word || undefined,
        dataItems: [
          ...(latestCheckIn?.note ? [`"${latestCheckIn.note.slice(0, 60)}"`] : []),
          ...(todayCheckIns && todayCheckIns.length > 1 ? [`${todayCheckIns.length} check-ins today`] : []),
        ],
        slider: HAWKINS_SLIDER,
        question: 'What emotion keeps coming back?',
        actions: ['Name what you feel', 'Where do you feel it in your body?', 'Is this emotion old or new?'],
        link: '/', linkLabel: 'Check in',
      };
    }
    case 'Presence':
      return {
        title: 'Presence',
        wisdom: 'Presence is where life actually happens. Not in the past you replay, not in the future you fear — but here, now. The quality of your attention is the quality of your life.',
        slider: PRESENCE_SLIDER,
        question: '',
        actions: [],
        doingQuestions: [
          { key: 'attention', label: 'Attention', placeholder: 'What is pulling your attention away?' },
          { key: 'practice', label: 'Practice', placeholder: 'What brings you back to the present?' },
          { key: 'reflection', label: 'Reflection', placeholder: 'What did you notice today about your presence?' },
          { key: 'action', label: 'Action', placeholder: 'One presence practice to track over time' },
        ],
      };
    case 'Direction':
      return {
        title: 'Direction',
        wisdom: 'Without direction, energy scatters. Direction is not about knowing every step — it is about knowing which horizon you are walking toward. Even one degree of clarity changes everything over time.',
        dataItems: visionText ? [visionText] : undefined,
        question: 'Do you know where you are going?',
        actions: ['Review your 6-month vision', 'What matters most this week?', 'Write one clear priority for today'],
        link: '/life-scan', linkLabel: 'Set your vision',
      };
    case 'Resources':
      return {
        title: 'Resources',
        wisdom: 'You already have more than you think. Your skills, your experience, your relationships — these are your resources. The question is not what you lack but what you are not yet using.',
        status: strengths?.length ? `${strengths.length} strength${strengths.length !== 1 ? 's' : ''} mapped` : undefined,
        dataItems: strengths?.slice(0, 4),
        question: 'What skill are you not using enough?',
        actions: ['Double down on one strength', 'Ask for help where you\'re weak', 'Learn one new thing this week'],
        link: '/life-scan', linkLabel: 'Map your strengths',
      };
    case 'Action': {
      const items: string[] = [];
      if (firstMove) items.push(`First move: ${firstMove}`);
      activeMissions.slice(0, 3).forEach(m => items.push(m.title));
      return {
        title: 'Action',
        wisdom: 'Action is where intention meets reality. You do not need to feel ready. You need to start. The smallest step forward is worth more than the grandest plan that stays in your head.',
        status: activeMissions.length ? `${activeMissions.length} active mission${activeMissions.length !== 1 ? 's' : ''}` : undefined,
        dataItems: items.length ? items : undefined,
        question: 'What is the one thing to do right now?',
        actions: ['Start with just 5 minutes', 'Remove one distraction', 'Ship before perfect', 'Say no to one thing'],
        link: '/', linkLabel: 'Manage missions',
      };
    }
    case 'Structure':
      return {
        title: 'Structure',
        wisdom: 'Structure is freedom in disguise. Without it you drift, with it you build. The right routine does not cage you — it creates the container where your best work happens. Organisation is the foundation of clarity.',
        question: '',
        actions: [],
        doingQuestions: [
          { key: 'routine', label: 'Routine', placeholder: 'What routine is broken right now?' },
          { key: 'organisation', label: 'Organisation', placeholder: 'What area of your life needs organising?' },
          { key: 'systems', label: 'Systems', placeholder: 'What system would make your life easier?' },
          { key: 'discipline', label: 'Discipline', placeholder: 'What discipline are you avoiding?' },
          { key: 'action', label: 'Action', placeholder: 'One thing to organise or restore today' },
        ],
      };
    case 'Family':
      return {
        title: 'Family',
        wisdom: 'Family is the mirror you did not choose. It shows you who you are, where you come from, and what patterns you carry. The work is not to change them — it is to change how you show up.',
        status: blockedMissions.length ? `${blockedMissions.length} mission${blockedMissions.length !== 1 ? 's' : ''} blocked` : undefined,
        question: 'What can you bring to your family dynamics?',
        actions: ['Show up differently', 'Express appreciation', 'Listen without trying to fix', 'Take responsibility for your part'],
      };
    case 'Love':
      return {
        title: 'Love',
        wisdom: 'Love is not something you find — it is something you practice. It starts with how you treat yourself and ripples outward. The deepest courage is to love without armor.',
        dataItems: visionWho ? [visionWho] : undefined,
        question: 'Where are you holding back emotionally?',
        actions: ['Be vulnerable with someone', 'Say what you actually feel', 'One small act of care today', 'Accept help without guilt'],
        link: '/life-scan', linkLabel: 'Who can you talk to?',
      };
    case 'Friends':
      return {
        title: 'Friends',
        wisdom: 'Friends are the family you choose. They sharpen you, hold you accountable, and remind you who you are when you forget. But friendship requires showing up — not just when it is easy.',
        question: 'What friendship are you neglecting?',
        actions: ['Text one friend right now', 'Plan something this week', 'Show up for someone', 'Be more honest in a conversation'],
      };
    case 'Network':
      return {
        title: 'Network',
        wisdom: 'Your network is your reach beyond yourself. It is not about collecting contacts — it is about meaningful exchanges. Who challenges you to grow? Who needs what you have to offer?',
        question: 'Who do you want to contact?',
        actions: ['Who can you learn from?', 'Who can you reconnect with?', 'Who challenges you to grow?', 'Who needs your help?'],
      };
    default:
      return { title: segment, question: '', actions: [] };
  }
}

function WheelSVG({ wheel, activeSegment, onSegmentClick, size = 220 }: {
  wheel: typeof WHEELS[0]; activeSegment: string | null; onSegmentClick: (s: string) => void; size?: number;
}) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const segColors = [wheel.colors[0], wheel.colors[1], wheel.colors[0], wheel.colors[1]];
  // Labels match X-divided paths: path 0=right, 1=bottom, 2=left, 3=top
  const labelDist = r * 0.52;
  const labelPos = [
    { x: cx + labelDist, y: cy },        // segment 0 → right
    { x: cx, y: cy + labelDist + 2 },    // segment 1 → bottom
    { x: cx - labelDist, y: cy },         // segment 2 → left
    { x: cx, y: cy - labelDist },         // segment 3 → top
  ];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="cursor-pointer">
      {segColors.map((color, i) => {
        const sa = i * 90 - 45, ea = sa + 90;
        const sr = (sa * Math.PI) / 180, er = (ea * Math.PI) / 180;
        const isActive = activeSegment === wheel.segments[i];
        return (
          <path key={i} d={`M${cx},${cy} L${cx + r * Math.cos(sr)},${cy + r * Math.sin(sr)} A${r},${r} 0 0,1 ${cx + r * Math.cos(er)},${cy + r * Math.sin(er)} Z`}
            fill={color} opacity={isActive ? 0.85 : 0.5} onClick={() => onSegmentClick(wheel.segments[i])}
            className="transition-opacity duration-200 cursor-pointer" />
        );
      })}
      <line x1={cx - r * 0.7} y1={cy - r * 0.7} x2={cx + r * 0.7} y2={cy + r * 0.7} stroke="white" strokeWidth="3" />
      <line x1={cx + r * 0.7} y1={cy - r * 0.7} x2={cx - r * 0.7} y2={cy + r * 0.7} stroke="white" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={5} fill="white" />
      {wheel.segments.map((label, i) => {
        const isActive = activeSegment === label;
        return (
          <text key={i} x={labelPos[i].x} y={labelPos[i].y} textAnchor="middle" dominantBaseline="central"
            onClick={() => onSegmentClick(label)} className="cursor-pointer select-none"
            style={{ fontSize: size * 0.07, fontWeight: isActive ? 700 : 600, fill: isActive ? '#3A3020' : '#5A4535', fontFamily: "'DM Sans', sans-serif" }}>
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function SegmentSlider({ slider, initialValue }: { slider: SliderDef; initialValue: number }) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = slider.levels.length;
  const idx = Math.min(Math.round((value / 100) * (count - 1)), count - 1);
  const current = slider.levels[idx];

  function save(v: number) {
    fetch('/api/life-scan-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { [slider.key]: String(v) } }),
    }).then(() => { setSaved(true); setTimeout(() => setSaved(false), 1500); });
  }

  function handleInteract(clientX: number, rect: DOMRect) {
    const v = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
    setValue(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(v), 600);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold tracking-tight transition-all duration-300"
          style={{ color: current.color }}>
          {current.label}
        </p>
        {saved && <span className="text-[10px]" style={{ color: '#C4A060' }}>saved</span>}
      </div>
      <div className="flex gap-[2px] rounded-lg overflow-hidden cursor-pointer"
        style={{ touchAction: 'none' }}
        onMouseDown={e => handleInteract(e.clientX, e.currentTarget.getBoundingClientRect())}
        onMouseMove={e => { if (e.buttons > 0) handleInteract(e.clientX, e.currentTarget.getBoundingClientRect()); }}
        onTouchStart={e => handleInteract(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
        onTouchMove={e => { e.preventDefault(); handleInteract(e.touches[0].clientX, e.currentTarget.getBoundingClientRect()); }}>
        {slider.levels.map((lvl, i) => {
          const isSelected = i === idx;
          const dist = Math.abs(i - idx);
          return (
            <div key={lvl.label} style={{
              flex: 1, height: 24,
              background: lvl.color,
              opacity: isSelected ? 1 : dist === 1 ? 0.55 : 0.2,
              borderRadius: i === 0 ? '6px 0 0 6px' : i === count - 1 ? '0 6px 6px 0' : 0,
              transition: 'all 0.2s',
            }} />
          );
        })}
      </div>
    </div>
  );
}

function SegmentNote({ segmentKey, initial, color, onSaved, label, placeholder }: { segmentKey: string; initial: string; color: string; onSaved?: (key: string, value: string) => void; label?: string; placeholder?: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const key = `overview_${segmentKey}`;

  function save() {
    setSaving(true);
    fetch('/api/life-scan-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { [key]: value } }),
    }).then(() => {
      setSaved(true);
      setDirty(false);
      setSaving(false);
      onSaved?.(segmentKey, value);
      setTimeout(() => setSaved(false), 1500);
    }).catch(() => setSaving(false));
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>{label}</p>
      )}
      <textarea
        value={value}
        onChange={e => { setValue(e.target.value); setDirty(true); setSaved(false); }}
        placeholder={placeholder || 'Write your thoughts...'}
        rows={2}
        className="w-full rounded-xl border border-border bg-background/60 p-3 text-sm resize-none outline-none focus:ring-1 placeholder:text-muted-foreground/40"
      />
      <div className="flex items-center justify-end gap-2">
        {saved && <span className="text-[10px]" style={{ color: '#C4A060' }}>saved</span>}
        {dirty && (
          <button type="button" onClick={save} disabled={saving}
            className="rounded-lg px-3 py-1 text-[11px] font-medium transition-colors"
            style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CompassWheel({ data = {} }: { data?: CompassData }) {
  const [wheelIndex, setWheelIndex] = useState(0);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [showWisdom, setShowWisdom] = useState(false);
  const currentWheel = WHEELS[wheelIndex];

  useEffect(() => {
    fetch('/api/life-scan-answers')
      .then(r => r.ok ? r.json() : { answers: {} })
      .then(d => {
        const n: Record<string, string> = {};
        const sv: Record<string, number> = {};
        for (const [k, v] of Object.entries(d.answers || {})) {
          if (k.startsWith('overview_')) {
            const key = k.replace('overview_', '');
            n[key] = v as string;
          }
        }
        const hv = d.answers?.[HAWKINS_SLIDER.key];
        if (hv) sv[HAWKINS_SLIDER.key] = Number(hv);
        const pv = d.answers?.[PRESENCE_SLIDER.key];
        if (pv) sv[PRESENCE_SLIDER.key] = Number(pv);
        setNotes(n);
        setSliderValues(sv);
      });
  }, []);

  const segContent = activeSegment ? getSegmentContent(activeSegment, data) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <button type="button" onClick={() => { setActiveSegment(null); setWheelIndex((wheelIndex - 1 + 3) % 3); }}
          className="text-xl text-muted-foreground hover:text-foreground transition-colors px-8 py-16 -mr-6 cursor-pointer">‹</button>
        <div className="flex flex-col items-center gap-2">
          <span className="text-base font-bold uppercase tracking-widest" style={{ color: currentWheel.colors[1] }}>
            {currentWheel.name}
          </span>
          <WheelSVG wheel={currentWheel} activeSegment={activeSegment}
            onSegmentClick={s => { setActiveSegment(activeSegment === s ? null : s); setShowWisdom(false); }} size={220} />
        </div>
        <button type="button" onClick={() => { setActiveSegment(null); setWheelIndex((wheelIndex + 1) % 3); }}
          className="text-xl text-muted-foreground hover:text-foreground transition-colors px-8 py-16 -ml-6 cursor-pointer">›</button>
      </div>

      <div className="flex justify-center gap-2">
        {WHEELS.map((w, i) => (
          <div key={w.id} className="w-2 h-2 rounded-full transition-all"
            style={{ background: w.colors[1], opacity: i === wheelIndex ? 0.8 : 0.2 }} />
        ))}
      </div>

      {segContent && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 animate-in fade-in duration-200">
          {/* Segment title + wisdom */}
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: currentWheel.colors[1] }}>{segContent.title}</p>
            {segContent.wisdom && (
              <>
                {!showWisdom ? (
                  <button type="button" onClick={() => setShowWisdom(true)}
                    className="text-[9px] text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors mt-1 italic">
                    ✦
                  </button>
                ) : (
                  <button type="button" onClick={() => setShowWisdom(false)}
                    className="mt-2 block animate-in fade-in duration-300">
                    <p className="text-[11px] leading-relaxed italic text-muted-foreground/60 px-2">
                      {segContent.wisdom}
                    </p>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Status */}
          {segContent.status && (
            <p className="text-[10px] text-center text-muted-foreground">{segContent.status}</p>
          )}

          {/* Slider */}
          {segContent.slider && (
            <SegmentSlider
              slider={segContent.slider}
              initialValue={sliderValues[segContent.slider.key] ?? 50}
            />
          )}

          {/* Data from life scan / check-ins / missions */}
          {segContent.dataItems && segContent.dataItems.length > 0 && (
            <div className="space-y-1">
              {segContent.dataItems.map((item, i) => (
                <p key={i} className="text-xs text-center text-muted-foreground">{item}</p>
              ))}
            </div>
          )}

          {/* Question */}
          {segContent.question && (
            <p className="text-sm font-semibold text-center" style={{ color: '#5A4535' }}>
              {segContent.question}
            </p>
          )}

          {/* Actions */}
          {segContent.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {segContent.actions.map(action => (
                <span key={action} className="px-3 py-1.5 rounded-xl text-[11px] font-medium"
                  style={{
                    background: `${currentWheel.colors[0]}25`,
                    border: `1px solid ${currentWheel.colors[1]}25`,
                    color: '#5A4535',
                  }}>
                  {action}
                </span>
              ))}
            </div>
          )}

          {/* 3-pill system (Past / Questions / Follow up) or single note */}
          {activeSegment && segContent.doingQuestions ? (
            <SegmentPills
              key={activeSegment}
              segment={activeSegment}
              color={currentWheel.colors[1]}
              doingQuestions={segContent.doingQuestions}
              notes={notes}
              onSaveAnswers={(updated) => setNotes(prev => ({ ...prev, ...updated }))}
              missions={data.missions?.filter(m => !m.completed).map(m => ({ id: m.id, title: m.title }))}
              hasWeaknessMap={segContent.hasWeaknessMap}
            />
          ) : activeSegment ? (
            <SegmentNote
              key={activeSegment}
              segmentKey={activeSegment}
              initial={notes[activeSegment] || ''}
              color={currentWheel.colors[1]}
              onSaved={(k, v) => setNotes(prev => ({ ...prev, [k]: v }))}
            />
          ) : null}

          {/* Link */}
          {segContent.link && (
            <div className="text-center pt-1">
              <Link href={segContent.link} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                {segContent.linkLabel || 'Go →'}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
