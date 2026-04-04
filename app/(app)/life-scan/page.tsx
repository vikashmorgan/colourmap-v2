'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

function AutoSaveTextarea({
  value,
  onChange,
  placeholder,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  style?: React.CSSProperties;
}) {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(v: string) {
    onChange(v);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim()) {
      timer.current = setTimeout(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }, 1100);
    }
  }

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[60px] rounded-xl border border-border bg-background/60 p-3 pr-14 text-sm resize-none outline-none"
        style={{ color: '#5A4535', ...style }}
      />
      {saved && (
        <span
          className="absolute right-3 bottom-3 text-[10px] font-medium animate-in fade-in duration-200"
          style={{ color: '#C4A060' }}
        >
          saved
        </span>
      )}
    </div>
  );
}

function SaveableQuestion({
  question,
  placeholder,
  color,
  answers,
  setAnswers,
  fieldKey,
}: {
  question: string;
  placeholder: string;
  color: string;
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  fieldKey: string;
}) {
  const items = (answers[`${fieldKey}_list`] || '').split('|||').filter(Boolean);
  const draft = answers[fieldKey] || '';

  function handleSave() {
    const txt = draft.trim();
    if (!txt) return;
    const current = items.filter(Boolean);
    if (!current.includes(txt)) {
      setAnswers((prev) => ({
        ...prev,
        [`${fieldKey}_list`]: [...current, txt].join('|||'),
        [fieldKey]: '',
      }));
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-center mb-2" style={{ color: '#5A4535' }}>
        {question}
      </p>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center mb-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px]"
              style={{ background: `${color}12`, border: `1px solid ${color}25`, color }}
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => {
                  const next = items.filter((_, j) => j !== i);
                  setAnswers((prev) => ({ ...prev, [`${fieldKey}_list`]: next.join('|||') }));
                }}
                className="opacity-50 hover:opacity-100 ml-0.5"
              >
                &#x2715;
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="relative">
        <textarea
          value={draft}
          onChange={(e) => setAnswers((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSave();
            }
          }}
          placeholder={placeholder}
          className="w-full min-h-[50px] rounded-xl border border-border bg-background/60 p-3 pr-14 text-sm resize-none outline-none"
          style={{ color: '#5A4535' }}
        />
        {draft.trim() && (
          <button
            type="button"
            onClick={handleSave}
            className="absolute right-3 bottom-3 text-[10px] font-medium transition-colors"
            style={{ color: `${color}80` }}
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
}

export default function LifeScanPage() {
  const [activeSection, setActiveSection] = useState<'blocks' | 'flow' | 'vision' | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load answers on mount
  useEffect(() => {
    fetch('/api/life-scan-answers')
      .then((res) => res.json())
      .then((data) => {
        if (data.answers && typeof data.answers === 'object') {
          setAnswers(data.answers);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Auto-save with debounce
  const saveAnswers = useCallback((toSave: Record<string, string>) => {
    setSaveStatus('saving');
    fetch('/api/life-scan-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: toSave }),
    })
      .then((res) => {
        if (res.ok) setSaveStatus('saved');
      })
      .catch(() => setSaveStatus('idle'));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Only save _list and long-form fields, not drafts
      const toSave: Record<string, string> = {};
      for (const [k, v] of Object.entries(answers)) {
        if (v.trim()) toSave[k] = v;
      }
      if (Object.keys(toSave).length > 0) {
        saveAnswers(toSave);
      }
    }, 1000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [answers, loaded, saveAnswers]);

  // Clear "Saved" after 2s
  useEffect(() => {
    if (saveStatus === 'saved') {
      const t = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  // Program suggestions based on blocks
  const fears = (answers.block_fears_list || '').split('|||').filter(Boolean);
  const weaknesses = (answers.block_weak_list || '').split('|||').filter(Boolean);
  const hasBodyWeakness = weaknesses.some((w) =>
    /body|health|fitness|weight|sleep|energy/i.test(w),
  );
  const suggestions: { label: string; href: string }[] = [];
  if (fears.length > 0) {
    suggestions.push({ label: 'Fears & Avoidance', href: '/programs' });
    suggestions.push({ label: 'Confidence Builder', href: '/programs' });
  }
  if (hasBodyWeakness) {
    suggestions.push({ label: 'Body Reset', href: '/programs' });
  }

  return (
    <main className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-center gap-3">
        <p className="text-center text-lg font-semibold tracking-wide" style={{ color: '#5C3018' }}>
          Life Scan
        </p>
        {saveStatus === 'saving' && (
          <span className="text-[10px] text-muted-foreground animate-pulse">saving</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-[10px] font-medium" style={{ color: '#C4A060' }}>
            saved
          </span>
        )}
      </div>

      {/* Three circles — Blocks & Flow & Vision */}
      <div className="flex justify-center gap-10 pt-4">
        {[
          { id: 'vision' as const, color: '#C4A060', label: 'Vision' },
          { id: 'blocks' as const, color: '#E0844A', label: 'Blocks' },
          { id: 'flow' as const, color: '#7A8A50', label: 'Flow' },
        ].map((dot) => {
          const isActive = activeSection === dot.id;
          return (
            <button
              key={dot.id}
              type="button"
              onClick={() => setActiveSection(isActive ? null : dot.id)}
              className="flex flex-col items-center gap-2 transition-all"
            >
              <div
                className="rounded-full transition-all duration-300"
                style={{
                  width: 52,
                  height: 52,
                  backgroundColor: dot.color,
                  opacity: isActive ? 0.7 : 0.35,
                  border: isActive ? `2px solid ${dot.color}` : '2px solid transparent',
                }}
              />
              <span
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: isActive ? dot.color : `${dot.color}80` }}
              >
                {dot.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* BLOCKS */}
      {activeSection === 'blocks' && (
        <div className="rounded-3xl border border-border bg-card p-6 space-y-4 animate-in fade-in duration-200">
          <SaveableQuestion
            question="What are you afraid of?"
            placeholder="Write a fear and press Enter to save..."
            color="#8A7A5A"
            answers={answers}
            setAnswers={setAnswers}
            fieldKey="block_fears"
          />

          {(answers.block_fears_list || '').trim() && (
            <>
              <div className="flex justify-center">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    background: '#E0844A',
                    opacity: 0.45,
                    transform: 'rotate(45deg)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <SaveableQuestion
                question="What are your weaknesses?"
                placeholder="Write a weakness and press Enter..."
                color="#8A7A5A"
                answers={answers}
                setAnswers={setAnswers}
                fieldKey="block_weak"
              />
            </>
          )}

          {(answers.block_weak_list || '').trim() && (
            <>
              <div className="flex justify-center">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    background: '#E0844A',
                    opacity: 0.45,
                    transform: 'rotate(45deg)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <SaveableQuestion
                question="What relationships does this impact?"
                placeholder="Write a relationship and press Enter..."
                color="#8A7A5A"
                answers={answers}
                setAnswers={setAnswers}
                fieldKey="block_relationships"
              />
            </>
          )}

          {(answers.block_relationships_list || '').trim() && (
            <>
              <div className="flex justify-center">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    background: '#E0844A',
                    opacity: 0.45,
                    transform: 'rotate(45deg)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-center mb-2" style={{ color: '#5A4535' }}>
                  What is the context?
                </p>
                <AutoSaveTextarea
                  value={answers.block_context || ''}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, block_context: v }))}
                  placeholder="What is happening around you..."
                />
              </div>
            </>
          )}

          {(answers.block_context || '').trim() && (
            <>
              <div className="flex justify-center">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    background: '#E0844A',
                    opacity: 0.45,
                    transform: 'rotate(45deg)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-center mb-2" style={{ color: '#5A4535' }}>
                  What would change if you overcame this?
                </p>
                <AutoSaveTextarea
                  value={answers.block_overcome || ''}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, block_overcome: v }))}
                  placeholder="Imagine the other side..."
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* FLOW */}
      {activeSection === 'flow' && (
        <div className="rounded-3xl border border-border bg-card p-6 space-y-4 animate-in fade-in duration-200">
          <SaveableQuestion
            question="What are you good at?"
            placeholder="Write a strength and press Enter..."
            color="#7A8A50"
            answers={answers}
            setAnswers={setAnswers}
            fieldKey="flow_strengths"
          />

          {(answers.flow_strengths_list || '').trim() && (
            <>
              <div className="flex justify-center">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    background: '#7A8A50',
                    opacity: 0.45,
                    transform: 'rotate(45deg)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <SaveableQuestion
                question="What is working well right now?"
                placeholder="Write something that works and press Enter..."
                color="#7A8A50"
                answers={answers}
                setAnswers={setAnswers}
                fieldKey="flow_working"
              />
            </>
          )}

          {(answers.flow_working_list || '').trim() && (
            <>
              <div className="flex justify-center">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    background: '#7A8A50',
                    opacity: 0.45,
                    transform: 'rotate(45deg)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <SaveableQuestion
                question="What gives you energy?"
                placeholder="Write what activates you and press Enter..."
                color="#7A8A50"
                answers={answers}
                setAnswers={setAnswers}
                fieldKey="flow_energy"
              />
            </>
          )}

          {(answers.flow_energy_list || '').trim() && (
            <>
              <div className="flex justify-center">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    background: '#7A8A50',
                    opacity: 0.45,
                    transform: 'rotate(45deg)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-center mb-2" style={{ color: '#5A4535' }}>
                  How can you do more of what works?
                </p>
                <AutoSaveTextarea
                  value={answers.flow_more || ''}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, flow_more: v }))}
                  placeholder="What would you double down on..."
                />
              </div>
            </>
          )}

          {(answers.flow_more || '').trim() && (
            <>
              <div className="flex justify-center">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    background: '#7A8A50',
                    opacity: 0.45,
                    transform: 'rotate(45deg)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-center mb-2" style={{ color: '#5A4535' }}>
                  How can this help others?
                </p>
                <AutoSaveTextarea
                  value={answers.flow_others || ''}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, flow_others: v }))}
                  placeholder="Who benefits from your strengths..."
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* VISION */}
      {activeSection === 'vision' && (
        <div className="rounded-3xl border border-border bg-card p-6 space-y-4 animate-in fade-in duration-200">
          <div>
            <p className="text-sm font-semibold text-center mb-2" style={{ color: '#5A4535' }}>
              Where do you want to be in 6 months?
            </p>
            <AutoSaveTextarea
              value={answers.vision_where || ''}
              onChange={(v) => setAnswers((prev) => ({ ...prev, vision_where: v }))}
              placeholder="Not goals — just a picture..."
            />
          </div>

          {(answers.vision_where || '').trim() && (
            <>
              <div className="flex justify-center">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    background: '#C4A060',
                    opacity: 0.45,
                    transform: 'rotate(45deg)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-center mb-2" style={{ color: '#5A4535' }}>
                  What needs to change to get there?
                </p>
                <AutoSaveTextarea
                  value={answers.vision_change || ''}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, vision_change: v }))}
                  placeholder="What's between here and there..."
                />
              </div>
            </>
          )}

          {(answers.vision_change || '').trim() && (
            <>
              <div className="flex justify-center">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    background: '#C4A060',
                    opacity: 0.45,
                    transform: 'rotate(45deg)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-center mb-2" style={{ color: '#5A4535' }}>
                  What strengths can carry you there?
                </p>
                <AutoSaveTextarea
                  value={answers.vision_strengths || ''}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, vision_strengths: v }))}
                  placeholder="What you already have that matters..."
                />
              </div>
            </>
          )}

          {(answers.vision_strengths || '').trim() && (
            <>
              <div className="flex justify-center">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    background: '#C4A060',
                    opacity: 0.45,
                    transform: 'rotate(45deg)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-center mb-2" style={{ color: '#5A4535' }}>
                  What is the first move?
                </p>
                <AutoSaveTextarea
                  value={answers.vision_first || ''}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, vision_first: v }))}
                  placeholder="One concrete thing..."
                />
              </div>
            </>
          )}

          {(answers.vision_first || '').trim() && (
            <>
              <div className="flex justify-center">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    background: '#C4A060',
                    opacity: 0.45,
                    transform: 'rotate(45deg)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-center mb-2" style={{ color: '#5A4535' }}>
                  Who can you talk to about your transformation?
                </p>
                <AutoSaveTextarea
                  value={answers.vision_who || ''}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, vision_who: v }))}
                  placeholder="Who would understand, support, challenge you..."
                />
              </div>
            </>
          )}

          {(answers.vision_who || '').trim() && (
            <>
              <div className="flex justify-center">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    background: '#C4A060',
                    opacity: 0.45,
                    transform: 'rotate(45deg)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-center mb-2" style={{ color: '#5A4535' }}>
                  What would you tell yourself 6 months from now?
                </p>
                <AutoSaveTextarea
                  value={answers.vision_letter || ''}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, vision_letter: v }))}
                  placeholder="Dear future me..."
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* TASK 4: Program suggestions based on blocks */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-2 animate-in fade-in duration-200">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground text-center">
            Suggested programs
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.slice(0, 3).map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors border border-[#C4A060]/30 bg-[#C4A060]/8 text-[#8A7A5A] hover:bg-[#C4A060]/15"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
