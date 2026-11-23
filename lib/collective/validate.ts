import { ARCHETYPES, type ArchetypeId, type Member } from './model';
import { MAX_MEMBERS, MAX_QUESTION } from './prompt';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strs = (v: unknown) =>
  Array.isArray(v)
    ? v
        .map((x) => str(x, 160))
        .filter(Boolean)
        .slice(0, 6)
    : [];

function member(v: unknown): Member | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const name = str(o.name, 40);
  if (!name) return null;
  const archetype = ARCHETYPES.some((a) => a.id === o.archetype)
    ? (o.archetype as ArchetypeId)
    : 'maker';
  return {
    id: str(o.id, 60) || name,
    name,
    color: str(o.color, 16) || '#e8c27a',
    archetype,
    style: str(o.style, 160),
    skills: strs(o.skills),
    strengths: strs(o.strengths),
    places: strs(o.places),
    moments: strs(o.moments),
    intentions: strs(o.intentions),
  };
}

export type AskInput = { members: Member[]; question: string };

/** Validates the body of an ask: 1 to 13 member profiles and a question. */
export function parseAsk(
  input: unknown,
): { ok: true; value: AskInput } | { ok: false; error: string } {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'Invalid input' };
  const { members, question } = input as { members?: unknown; question?: unknown };
  if (typeof question !== 'string' || !question.trim())
    return { ok: false, error: 'A question is required' };
  if (question.trim().length > MAX_QUESTION) return { ok: false, error: 'Question too long' };
  if (!Array.isArray(members) || members.length === 0)
    return { ok: false, error: 'Pick at least one person' };
  if (members.length > MAX_MEMBERS) return { ok: false, error: 'Too many people' };
  const parsed = members.map(member);
  if (parsed.some((m) => m === null)) return { ok: false, error: 'Invalid person' };
  return { ok: true, value: { members: parsed as Member[], question: question.trim() } };
}
