import { getDb } from '@/lib/db/client';
import { type CheckIn, insertCheckIn } from '@/lib/db/queries/check-ins';

const MAX_NOTE_LENGTH = 500;

export class CheckInValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckInValidationError';
  }
}

export async function createCheckIn(
  userId: string,
  input: { sliderValue: number; note?: string | null },
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

  return insertCheckIn(getDb(), { userId, sliderValue, note });
}
