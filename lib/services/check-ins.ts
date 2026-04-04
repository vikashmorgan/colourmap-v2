import { getDb } from '@/lib/db/client';
import { type CheckIn, insertCheckIn } from '@/lib/db/queries/check-ins';

const MAX_NOTE_LENGTH = 500;
const ALLOWED_TAGS = ['Work', 'Body', 'Relationships', 'Creative', 'General'] as const;

export class CheckInValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckInValidationError';
  }
}

export async function createCheckIn(
  userId: string,
  input: {
    sliderValue: number;
    note?: string | null;
    tags?: string[] | null;
    missionId?: string | null;
    emotionName?: string | null;
    emotionColor?: string | null;
  },
): Promise<CheckIn> {
  const { sliderValue } = input;

  if (!Number.isInteger(sliderValue) || sliderValue < 0 || sliderValue > 100) {
    throw new CheckInValidationError('sliderValue must be an integer between 0 and 100');
  }

  let note: string | null = null;
  if (input.note != null) {
    const trimmed = input.note.trim();
    if (trimmed.length > 0) {
      note = trimmed.slice(0, MAX_NOTE_LENGTH);
    }
  }

  let tags: string[] | null = null;
  if (Array.isArray(input.tags) && input.tags.length > 0) {
    const valid = input.tags.filter(
      (t): t is string =>
        typeof t === 'string' && ALLOWED_TAGS.includes(t as (typeof ALLOWED_TAGS)[number]),
    );
    tags = valid.length > 0 ? valid : null;
  }

  const missionId = typeof input.missionId === 'string' ? input.missionId : null;

  const emotionName = typeof input.emotionName === 'string' ? input.emotionName : null;
  const emotionColor = typeof input.emotionColor === 'string' ? input.emotionColor : null;

  return insertCheckIn(getDb(), { userId, sliderValue, note, tags, missionId, emotionName, emotionColor });
}
