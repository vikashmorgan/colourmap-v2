import { getDb } from '@/lib/db/client';
import {
  deleteMission,
  getMissions,
  insertMission,
  type Mission,
  toggleMission,
} from '@/lib/db/queries/missions';

const MAX_TITLE_LENGTH = 200;

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

export async function updateMissionStatus(
  userId: string,
  missionId: string,
  completed: boolean,
): Promise<Mission | null> {
  return toggleMission(getDb(), userId, missionId, completed);
}

export async function removeMission(userId: string, missionId: string): Promise<boolean> {
  return deleteMission(getDb(), userId, missionId);
}
