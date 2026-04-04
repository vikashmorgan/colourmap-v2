'use client';

import { useState } from 'react';

interface LogEntry {
  text: string;
  date: string;
}

interface Action {
  what: string;
  by: string; // date string or ''
  firstStep: string;
  done: boolean;
  linkedTo?: string; // 'mission:<id>' or 'daily' or segment name
  linkedLabel?: string; // display name of what it's linked to
  inCockpit?: boolean;
}

interface DoingQ {
  key: string;
  label: string;
  placeholder: string;
}

interface MissionLink {
  id: string;
  title: string;
}

interface WeaknessEntry {
  weakness: string;
  response: string;
}

interface SegmentPillsProps {
  segment: string;
  color: string;
  doingQuestions?: DoingQ[];
  notes: Record<string, string>;
  onSaveAnswers: (answers: Record<string, string>) => void;
  missions?: MissionLink[];
  hasWeaknessMap?: boolean;
}

function Pill({
  label,
  color,
  open,
  onToggle,
  count,
  children,
}: {
  label: string;
  color: string;
  open: boolean;
  onToggle: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-all"
        style={{
          background: open ? `${color}15` : 'transparent',
          color: open ? color : `${color}80`,
          border: `1px solid ${open ? `${color}30` : `${color}15`}`,
        }}
      >
        <span className="flex items-center justify-center gap-2">
          {label}
          {count !== undefined && count > 0 && !open && (
            <span className="text-[9px] opacity-50">{count}</span>
          )}
        </span>
      </button>
      {open && <div className="pt-3 pb-1 animate-in fade-in duration-150">{children}</div>}
    </div>
  );
}

export default function SegmentPills({
  segment,
  color,
  doingQuestions,
  notes,
  onSaveAnswers,
  missions = [],
  hasWeaknessMap,
}: SegmentPillsProps) {
  const [openPill, setOpenPill] = useState<string | null>('questions');
  const [newEntry, setNewEntry] = useState('');
  const [saving, setSaving] = useState(false);

  // Parse stored data
  const logKey = `overview_${segment}_log`;
  const actionKey = `overview_${segment}_actions`;
  const weaknessKey = `overview_${segment}_weaknesses`;
  const log: LogEntry[] = (() => {
    try {
      return JSON.parse(notes[`${segment}_log`] || '[]');
    } catch {
      return [];
    }
  })();
  const actions: Action[] = (() => {
    try {
      return JSON.parse(notes[`${segment}_actions`] || '[]');
    } catch {
      return [];
    }
  })();
  const weaknesses: WeaknessEntry[] = (() => {
    try {
      return JSON.parse(notes[`${segment}_weaknesses`] || '[]');
    } catch {
      return [];
    }
  })();

  function saveToApi(key: string, value: string) {
    setSaving(true);
    fetch('/api/life-scan-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { [key]: value } }),
    })
      .then(() => {
        onSaveAnswers({ [key.replace('overview_', '')]: value });
        setSaving(false);
      })
      .catch(() => setSaving(false));
  }

  function addLogEntry() {
    if (!newEntry.trim()) return;
    const updated = [{ text: newEntry.trim(), date: new Date().toISOString() }, ...log];
    saveToApi(logKey, JSON.stringify(updated));
    setNewEntry('');
  }

  function removeLogEntry(idx: number) {
    const updated = log.filter((_, i) => i !== idx);
    saveToApi(logKey, JSON.stringify(updated));
  }

  function saveActions(updated: Action[]) {
    saveToApi(actionKey, JSON.stringify(updated));
  }

  function saveWeaknesses(updated: WeaknessEntry[]) {
    saveToApi(weaknessKey, JSON.stringify(updated));
  }

  function toggle(pill: string) {
    setOpenPill(openPill === pill ? null : pill);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return (
    <div className="space-y-0.5">
      {/* 1. Questions */}
      <Pill
        label="Questions"
        color={color}
        open={openPill === 'questions'}
        onToggle={() => toggle('questions')}
      >
        {doingQuestions ? (
          <QuestionPicker
            questions={doingQuestions}
            segment={segment}
            notes={notes}
            color={color}
            onSaveAnswers={onSaveAnswers}
          />
        ) : (
          <QuestionField
            qKey={`overview_${segment}`}
            label=""
            placeholder="Write your thoughts..."
            initial={notes[segment] || ''}
            color={color}
            onSaved={(v) => onSaveAnswers({ [segment]: v })}
          />
        )}
      </Pill>

      {/* 2. Battle Map (weakness mapping) */}
      {hasWeaknessMap && (
        <Pill
          label="Battle Map"
          color={color}
          open={openPill === 'battlemap'}
          onToggle={() => toggle('battlemap')}
          count={weaknesses.length}
        >
          <WeaknessMap
            weaknesses={weaknesses}
            color={color}
            saving={saving}
            onSave={saveWeaknesses}
          />
        </Pill>
      )}

      {/* 3. Notes */}
      <Pill
        label="Notes"
        color={color}
        open={openPill === 'notes'}
        onToggle={() => toggle('notes')}
        count={log.length}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addLogEntry();
              }}
              placeholder="Note something..."
              className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs outline-none placeholder:text-muted-foreground/40"
            />
            {newEntry.trim() && (
              <button
                type="button"
                onClick={addLogEntry}
                disabled={saving}
                className="text-[10px] font-medium px-2"
                style={{ color }}
              >
                {saving ? '...' : 'Add'}
              </button>
            )}
          </div>
          {log.length > 0 ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {log.map((entry, i) => (
                <div key={i} className="flex gap-2 text-xs group">
                  <span className="text-muted-foreground/40 shrink-0 text-[10px] pt-0.5">
                    {formatDate(entry.date)}
                  </span>
                  <span className="text-muted-foreground flex-1">{entry.text}</span>
                  <button
                    type="button"
                    onClick={() => removeLogEntry(i)}
                    className="text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/40 hover:!text-destructive transition-colors shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground/30 text-center py-1">No notes yet</p>
          )}
        </div>
      </Pill>

      {/* 3. Action Plan */}
      <Pill
        label="Action Plan"
        color={color}
        open={openPill === 'actions'}
        onToggle={() => toggle('actions')}
        count={actions.filter((a) => !a.done).length}
      >
        <ActionPlan
          actions={actions}
          color={color}
          saving={saving}
          onSave={saveActions}
          segment={segment}
          missions={missions}
        />
      </Pill>
    </div>
  );
}

function WeaknessMap({
  weaknesses,
  color,
  saving,
  onSave,
}: {
  weaknesses: WeaknessEntry[];
  color: string;
  saving: boolean;
  onSave: (w: WeaknessEntry[]) => void;
}) {
  const [newWeakness, setNewWeakness] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [editResponse, setEditResponse] = useState('');
  const [savingResponse, setSavingResponse] = useState(false);

  function addWeakness() {
    if (!newWeakness.trim()) return;
    onSave([...weaknesses, { weakness: newWeakness.trim(), response: '' }]);
    setNewWeakness('');
  }

  function saveResponse(idx: number) {
    setSavingResponse(true);
    const updated = [...weaknesses];
    updated[idx] = { ...updated[idx], response: editResponse };
    onSave(updated);
    setTimeout(() => setSavingResponse(false), 300);
  }

  function remove(idx: number) {
    onSave(weaknesses.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground/60 text-center leading-relaxed">
        Map what makes you feel weak or powerless.
        <br />
        Then write how you can face it.
      </p>

      {weaknesses.length > 0 && (
        <div className="space-y-2">
          {weaknesses.map((w, i) => {
            const isOpen = expandedIdx === i;
            const hasResponse = !!w.response.trim();
            return (
              <div key={i}>
                <div className="flex items-center gap-2 group">
                  <button
                    type="button"
                    onClick={() => {
                      if (isOpen) {
                        setExpandedIdx(null);
                      } else {
                        setExpandedIdx(i);
                        setEditResponse(w.response);
                      }
                    }}
                    className="flex-1 text-left rounded-2xl px-4 py-2.5 text-sm transition-all"
                    style={{
                      background: isOpen ? `${color}15` : hasResponse ? `${color}08` : `${color}04`,
                      border: `1.5px solid ${isOpen ? `${color}35` : hasResponse ? `${color}20` : `${color}10`}`,
                      color: isOpen ? color : hasResponse ? color : undefined,
                    }}
                  >
                    {w.weakness}
                    {hasResponse && !isOpen && <span className="ml-1.5 opacity-40">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-xs text-muted-foreground/0 group-hover:text-muted-foreground/40 hover:!text-destructive transition-colors shrink-0"
                  >
                    ×
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-3 pl-2 space-y-2 animate-in fade-in duration-150">
                    <p className="text-xs italic text-muted-foreground/60">
                      How can you face this? What would you tell yourself?
                    </p>
                    <textarea
                      value={editResponse}
                      onChange={(e) => setEditResponse(e.target.value)}
                      placeholder="Write your response..."
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background/60 p-3 text-sm resize-none outline-none placeholder:text-muted-foreground/40"
                    />
                    {hasResponse && (
                      <div className="rounded-xl p-3" style={{ background: `${color}06` }}>
                        <p className="text-xs leading-relaxed" style={{ color }}>
                          {w.response}
                        </p>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => saveResponse(i)}
                        disabled={savingResponse}
                        className="rounded-lg px-4 py-1.5 text-xs font-medium transition-colors"
                        style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
                      >
                        {savingResponse ? '...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newWeakness}
          onChange={(e) => setNewWeakness(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addWeakness();
          }}
          placeholder="What makes you feel powerless?"
          className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-2 text-sm outline-none placeholder:text-muted-foreground/40"
        />
        {newWeakness.trim() && (
          <button
            type="button"
            onClick={addWeakness}
            disabled={saving}
            className="text-xs font-medium px-3"
            style={{ color }}
          >
            {saving ? '...' : 'Add'}
          </button>
        )}
      </div>
    </div>
  );
}

function ActionPlan({
  actions,
  color,
  saving,
  onSave,
  segment,
  missions,
}: {
  actions: Action[];
  color: string;
  saving: boolean;
  onSave: (a: Action[]) => void;
  segment: string;
  missions: MissionLink[];
}) {
  const [adding, setAdding] = useState(false);
  const [what, setWhat] = useState('');
  const [by, setBy] = useState('');
  const [firstStep, setFirstStep] = useState('');
  const [linkTo, setLinkTo] = useState('');
  async function sendToCockpit(action: Action, idx: number) {
    const sectionsRes = await fetch('/api/sections');
    if (!sectionsRes.ok) return;
    const { sections } = await sectionsRes.json();

    // Determine section name: linked mission name, or segment plan
    let sectionName = `${segment} Plan`;
    if (action.linkedTo?.startsWith('mission:')) {
      const m = missions.find((m) => m.id === action.linkedTo?.replace('mission:', ''));
      if (m) sectionName = m.title;
    } else if (action.linkedTo === 'daily') {
      sectionName = 'Daily Tasks';
    }

    let section = sections.find((s: { name: string }) => s.name === sectionName);
    if (!section) {
      const createRes = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sectionName }),
      });
      if (!createRes.ok) return;
      section = await createRes.json();
    }

    const label = action.firstStep ? `${action.what} → ${action.firstStep}` : action.what;
    await fetch(`/api/sections/${section.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, type: 'check' }),
    });

    // Mark as sent and persist
    const updated = [...actions];
    updated[idx] = { ...updated[idx], inCockpit: true };
    onSave(updated);
  }

  function add() {
    if (!what.trim()) return;
    const linkedLabel =
      linkTo === 'daily'
        ? 'Daily'
        : linkTo.startsWith('mission:')
          ? missions.find((m) => m.id === linkTo.replace('mission:', ''))?.title
          : undefined;
    onSave([
      ...actions,
      {
        what: what.trim(),
        by,
        firstStep: firstStep.trim(),
        done: false,
        linkedTo: linkTo || undefined,
        linkedLabel: linkedLabel || undefined,
      },
    ]);
    setWhat('');
    setBy('');
    setFirstStep('');
    setLinkTo('');
    setAdding(false);
  }

  function toggleDone(idx: number) {
    const updated = [...actions];
    updated[idx] = { ...updated[idx], done: !updated[idx].done };
    onSave(updated);
  }

  function remove(idx: number) {
    onSave(actions.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {actions.length > 0 && (
        <div className="space-y-2">
          {actions.map((a, i) => (
            <div
              key={i}
              className={`rounded-xl border px-3 py-2.5 space-y-1 group ${
                a.done ? 'border-border/30 opacity-50' : 'border-border'
              }`}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => toggleDone(i)}
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors text-[9px] ${
                    a.done ? '' : 'border-muted-foreground/40'
                  }`}
                  style={
                    a.done
                      ? { borderColor: color, backgroundColor: color, color: 'white' }
                      : undefined
                  }
                >
                  {a.done ? '✓' : ''}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${a.done ? 'line-through' : ''}`}>{a.what}</p>
                  {a.firstStep && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      First step: {a.firstStep}
                    </p>
                  )}
                  {a.linkedLabel && (
                    <p className="text-[9px] mt-0.5" style={{ color }}>
                      ↳ {a.linkedLabel}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {a.by && (
                    <span className="text-[9px] text-muted-foreground/50">
                      by {new Date(a.by).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {!a.done && !a.inCockpit && (
                    <button
                      type="button"
                      onClick={() => sendToCockpit(a, i)}
                      className="text-[9px] text-muted-foreground/50 hover:text-foreground transition-colors"
                      title="Track in cockpit"
                    >
                      → cockpit
                    </button>
                  )}
                  {a.inCockpit && (
                    <span className="text-[9px]" style={{ color: '#C4A060' }}>
                      ✓ cockpit
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/40 hover:!text-destructive transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="rounded-xl border border-border p-3 space-y-2 animate-in fade-in duration-150">
          <input
            type="text"
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            placeholder="What will you do?"
            className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/40"
          />
          <input
            type="text"
            value={firstStep}
            onChange={(e) => setFirstStep(e.target.value)}
            placeholder="First step..."
            className="w-full bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/30"
          />
          {/* Link to */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground/40">link to</span>
            <button
              type="button"
              onClick={() => setLinkTo(linkTo === 'daily' ? '' : 'daily')}
              className={`rounded-full px-2 py-0.5 text-[9px] transition-colors ${
                linkTo === 'daily' ? 'font-medium' : 'text-muted-foreground/50'
              }`}
              style={
                linkTo === 'daily'
                  ? { background: `${color}15`, color, border: `1px solid ${color}30` }
                  : { border: '1px solid transparent' }
              }
            >
              Daily Tasks
            </button>
            {missions.map((m) => {
              const val = `mission:${m.id}`;
              const active = linkTo === val;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLinkTo(active ? '' : val)}
                  className={`rounded-full px-2 py-0.5 text-[9px] transition-colors ${
                    active ? 'font-medium' : 'text-muted-foreground/50'
                  }`}
                  style={
                    active
                      ? { background: `${color}15`, color, border: `1px solid ${color}30` }
                      : { border: '1px solid transparent' }
                  }
                >
                  {m.title.length > 20 ? `${m.title.slice(0, 20)}…` : m.title}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground/40">by</span>
              <input
                type="date"
                value={by}
                onChange={(e) => setBy(e.target.value)}
                className="bg-transparent text-[10px] text-muted-foreground outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-[10px] text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={add}
                disabled={!what.trim() || saving}
                className="text-[10px] font-medium"
                style={{ color }}
              >
                {saving ? '...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-border/40 text-[9px]">
            +
          </span>
          <span>Add an action</span>
        </button>
      )}
    </div>
  );
}

function QuestionPicker({
  questions,
  segment,
  notes,
  color,
  onSaveAnswers,
}: {
  questions: DoingQ[];
  segment: string;
  notes: Record<string, string>;
  color: string;
  onSaveAnswers: (answers: Record<string, string>) => void;
}) {
  const [activeQ, setActiveQ] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      {questions.map((dq) => {
        const qKey = `${segment}_${dq.key}`;
        const answer = notes[qKey]?.trim() || '';
        const isActive = activeQ === dq.key;
        return (
          <div key={dq.key}>
            <button
              type="button"
              onClick={() => setActiveQ(isActive ? null : dq.key)}
              className="w-full text-left px-3 py-2 rounded-xl transition-all"
              style={{
                background: isActive ? `${color}10` : 'transparent',
              }}
            >
              <p className="text-xs font-semibold" style={{ color }}>
                {dq.label}
              </p>
              {!isActive && answer && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{answer}</p>
              )}
              {!isActive && !answer && (
                <p className="text-[11px] text-muted-foreground/30 mt-0.5 italic">
                  {dq.placeholder}
                </p>
              )}
            </button>
            {isActive && (
              <div className="px-3 pb-2 animate-in fade-in duration-150">
                <QuestionField
                  key={dq.key}
                  qKey={`overview_${qKey}`}
                  label=""
                  placeholder={dq.placeholder}
                  initial={answer}
                  color={color}
                  onSaved={(v) => onSaveAnswers({ [qKey]: v })}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuestionField({
  qKey,
  label,
  placeholder,
  initial,
  color,
  onSaved,
}: {
  qKey: string;
  label: string;
  placeholder: string;
  initial: string;
  color: string;
  onSaved: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSavingState] = useState(false);

  function save() {
    setSavingState(true);
    fetch('/api/life-scan-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { [qKey]: value } }),
    })
      .then(() => {
        setSaved(true);
        setDirty(false);
        setSavingState(false);
        onSaved(value);
        setTimeout(() => setSaved(false), 1500);
      })
      .catch(() => setSavingState(false));
  }

  return (
    <div className="space-y-1">
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>
          {label}
        </p>
      )}
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
          setSaved(false);
        }}
        placeholder={placeholder}
        rows={2}
        className="w-full rounded-xl border border-border bg-background/60 p-3 text-sm resize-none outline-none placeholder:text-muted-foreground/40"
      />
      <div className="flex items-center justify-end gap-2">
        {saved && (
          <span className="text-[10px]" style={{ color: '#C4A060' }}>
            saved
          </span>
        )}
        {dirty && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg px-3 py-1 text-[11px] font-medium transition-colors"
            style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  );
}
