'use client';

import { useVoiceCapture } from '@/lib/hooks/use-voice-capture';

/* ═══════════════════════════════════════════════════════════
   MicDot — a small ochre dot inside a writing surface. Tap to
   record, tap to stop; the audio is stored, read, and the
   words appended to the field.

   WHAT CHANGED, AND WHY IT IS WORTH THE LOST IMMEDIACY

   This used to call the browser's Web Speech API and paint
   interim words into the field as you spoke. That felt
   instant and it had three faults that mattered more:

     - it did not render on iOS at all, which is where this
       app actually lives
     - it took one fixed language per session, and thinking
       here moves between French, Italian and English inside
       a single sentence
     - a failure lost the thought, because nothing but the
       text was ever kept

   Now the audio is recorded and stored first, then read. The
   words arrive a few seconds later instead of live. In
   exchange they arrive punctuated, in the language actually
   spoken, on a phone — and if the reading fails the
   recording is still there.

   Usage:
     <div style={{ position: 'relative' }}>
       <input value={v} onChange={...} />
       <MicDot visible={v.length > 0} value={v} onTranscript={setValue} />
     </div>
   ═══════════════════════════════════════════════════════════ */

const OCHRE = '#C4A060';

/*
 * The dot reads as 9px and is tappable at 44. Padding grows the hit area and
 * the matching negative margin gives the space back to the layout, so six
 * existing surfaces keep their spacing while the control stops being a 9px
 * target — which is an accessibility floor, not a preference.
 */
const HIT = 17;

interface MicDotProps {
  /** Controls visibility — show once the field has content */
  visible: boolean;
  /** Current field value — the transcript is appended to it */
  value: string;
  /** Called with the updated value (base + transcript) once reading finishes */
  onTranscript: (v: string) => void;
  /** Unused. Kept so callers need not change; language is now detected. */
  lang?: string;
}

/** What the dot is doing, in words, because colour alone cannot say it. */
export function labelFor(state: string, elapsed: number): string {
  if (state === 'recording') return `Stop recording (${elapsed}s)`;
  if (state === 'saving') return 'Saving the recording';
  if (state === 'reading') return 'Reading the recording';
  if (state === 'error') return 'Recording saved but not read — tap to try again';
  return 'Record a note';
}

export default function MicDot({ visible, value, onTranscript }: MicDotProps) {
  const { state, elapsed, supported, start, stop, reset } = useVoiceCapture({
    onTranscript: (text) => {
      /*
       * Appended, never replacing. Somebody speaking into a field they have
       * already half-written means to add to it, and the base value is read
       * at the moment the words arrive rather than captured at record time —
       * they may well have kept typing while it listened.
       */
      const base = value.trimEnd();
      onTranscript(base ? `${base} ${text}` : text);
    },
  });

  if (!supported || !visible) return null;

  const busy = state === 'saving' || state === 'reading';
  const failed = state === 'error';

  return (
    <>
      <style>{`
        @keyframes mic-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.6; }
        }
        @keyframes mic-think {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cm-mic-dot { animation-duration: 0.01ms !important; }
        }
      `}</style>
      <button
        type="button"
        aria-label={labelFor(state, elapsed)}
        /*
         * Busy is announced rather than only drawn, and the button is disabled
         * while the upload is in flight — a second tap there would start a new
         * recording on top of one still being filed.
         */
        aria-busy={busy}
        disabled={busy}
        onClick={() => {
          if (state === 'recording') stop();
          else if (failed) reset();
          else void start();
        }}
        style={{
          width: 9 + HIT * 2,
          height: 9 + HIT * 2,
          margin: -HIT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: busy ? 'progress' : 'pointer',
          padding: 0,
          flexShrink: 0,
        }}
      >
        <span
          className="cm-mic-dot"
          aria-hidden="true"
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            /*
             * Failure is drawn as a hollow ring, not a red dot. Red badges are
             * on the never list, and a ring reads as "this is waiting for you"
             * rather than as an alarm — which is accurate, since the recording
             * is safe and only the reading needs another go.
             */
            background: failed ? 'transparent' : state === 'recording' ? OCHRE : `${OCHRE}55`,
            boxShadow: failed ? `inset 0 0 0 1.5px ${OCHRE}` : 'none',
            animation:
              state === 'recording'
                ? 'mic-pulse 1s ease-in-out infinite'
                : busy
                  ? 'mic-think 1.1s ease-in-out infinite'
                  : 'none',
            transition: 'background 0.2s',
          }}
        />
      </button>
    </>
  );
}
