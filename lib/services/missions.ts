import { getDb } from '@/lib/db/client';
import {
  deleteMission,
  getMissions,
  insertMission,
  type Mission,
  updateMission,
} from '@/lib/db/queries/missions';

const MAX_TITLE_LENGTH = 200;
const MAX_TEXT_LENGTH = 2000;

export class MissionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissionValidationError';
  }
}

export async function createMission(userId: string, title: string): Promise<Mission> {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new MissionValidationError('Title is required');
  }
  return insertMission(getDb(), { userId, title: trimmed.slice(0, MAX_TITLE_LENGTH) });
}

export async function listMissions(userId: string): Promise<Mission[]> {
  return getMissions(getDb(), userId);
}

function trimField(value: string | null | undefined): string | null {
  if (value === undefined) return undefined as unknown as null;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_TEXT_LENGTH) : null;
}

export async function updateMissionFields(
  userId: string,
  missionId: string,
  data: {
    completed?: boolean;
    description?: string | null;
    blocking?: string | null;
    nextStep?: string | null;
    title?: string;
  },
): Promise<Mission | null> {
  const update: {
    completed?: boolean;
    description?: string | null;
    blocking?: string | null;
    nextStep?: string | null;
    title?: string;
  } = {};
  if (data.completed !== undefined) update.completed = data.completed;
  if (data.description !== undefined) update.description = trimField(data.description);
  if (data.blocking !== undefined) update.blocking = trimField(data.blocking);
  if (data.nextStep !== undefined) update.nextStep = trimField(data.nextStep);
  if (data.title !== undefined) update.title = data.title.trim().slice(0, MAX_TITLE_LENGTH);
  return updateMission(getDb(), userId, missionId, update);
}

export async function removeMission(userId: string, missionId: string): Promise<boolean> {
  return deleteMission(getDb(), userId, missionId);
}
