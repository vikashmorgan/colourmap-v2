import type { Member } from './model';
import { parseAsk } from './validate';

const KEY = 'collective:me';

/** Your own profile, kept on this device until groups move to accounts. */
export function loadMe(): Member | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = parseAsk({ members: [JSON.parse(raw)], question: '-' });
    return parsed.ok ? parsed.value.members[0] : null;
  } catch {
    return null;
  }
}

export function saveMe(me: Member | null) {
  try {
    if (me) localStorage.setItem(KEY, JSON.stringify(me));
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked (private mode): the profile lives for this visit only
  }
}
