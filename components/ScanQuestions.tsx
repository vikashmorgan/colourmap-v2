'use client';

interface ScanQuestionsProps {
  questions: string[];
  answers: Record<string, string>;
  onChange: (question: string, answer: string) => void;
}

export default function ScanQuestions({ questions, answers, onChange }: ScanQuestionsProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-center">Go deeper</p>
      <p className="text-xs text-muted-foreground text-center">
        Take your time. These are for you.
      </p>

      {questions.map((q) => (
        <div key={q} className="space-y-2">
          <p className="text-sm font-medium">{q}</p>
          <textarea
            placeholder="Write freely..."
            value={answers[q] ?? ''}
            onChange={(e) => onChange(q, e.target.value)}
            className="w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
          />
        </div>
      ))}
    </div>
  );
}
