import { getDb } from '@/lib/db/client';
import {
  deleteMission,
  getMissions,
  insertMission,
  type Mission,
  updateMission,
} from '@/lib/db/queries/missions';

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

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

export async function updateMissionFields(
  userId: string,
  missionId: string,
  data: { completed?: boolean; description?: string | null },
): Promise<Mission | null> {
  const update: { completed?: boolean; description?: string | null } = {};
  if (data.completed !== undefined) update.completed = data.completed;
  if (data.description !== undefined) {
    const desc = data.description?.trim() ?? null;
    update.description = desc ? desc.slice(0, MAX_DESCRIPTION_LENGTH) : null;
  }
  return updateMission(getDb(), userId, missionId, update);
}

export async function removeMission(userId: string, missionId: string): Promise<boolean> {
  return deleteMission(getDb(), userId, missionId);
}
