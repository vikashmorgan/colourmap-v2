import type { Member } from './model';

/** Shared themes the map can name. A theme matches when any keyword appears in a phrase. */
export const THEMES = [
  { id: 'space', name: 'A shared space', keys: ['studio', 'space', 'room', 'place', 'workshop'] },
  {
    id: 'app',
    name: 'Building tech',
    keys: ['app', 'software', 'product', 'code', 'data', 'tech'],
  },
  {
    id: 'image',
    name: 'Image & story',
    keys: ['photo', 'film', 'book', 'story', 'visual', 'image'],
  },
  { id: 'music', name: 'Music & nights', keys: ['music', 'song', 'live', 'night', 'sound', 'set'] },
  {
    id: 'table',
    name: 'Tables & hosting',
    keys: ['cook', 'dinner', 'table', 'food', 'host', 'sunday'],
  },
  {
    id: 'people',
    name: 'People & community',
    keys: ['people', 'community', 'strangers', 'friends', 'group'],
  },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export function themesOf(phrase: string): ThemeId[] {
  const text = phrase.toLowerCase();
  return THEMES.filter((t) => t.keys.some((k) => text.includes(k))).map((t) => t.id);
}

function themesIn(phrases: string[]): Set<ThemeId> {
  return new Set(phrases.flatMap(themesOf));
}

export type Link = {
  a: string;
  b: string;
  /** shared: both want it. complement: one can do what the other wants. */
  kind: 'shared' | 'complement';
  themes: ThemeId[];
};

/** How each pair of members relates: shared intentions, and skills that serve the other's intentions. */
export function linksBetween(members: Member[]): Link[] {
  const links: Link[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i];
      const b = members[j];
      const wantA = themesIn(a.intentions);
      const wantB = themesIn(b.intentions);
      const shared = [...wantA].filter((t) => wantB.has(t));
      if (shared.length) links.push({ a: a.id, b: b.id, kind: 'shared', themes: shared });
      const canA = themesIn([...a.skills, ...a.strengths]);
      const canB = themesIn([...b.skills, ...b.strengths]);
      const serves = [
        ...new Set([
          ...[...canA].filter((t) => wantB.has(t)),
          ...[...canB].filter((t) => wantA.has(t)),
        ]),
      ].filter((t) => !shared.includes(t));
      if (serves.length) links.push({ a: a.id, b: b.id, kind: 'complement', themes: serves });
    }
  }
  return links;
}

/** Themes wanted by at least two members, with who wants them: the group's planets. */
export function sharedThemes(members: Member[]): { id: ThemeId; name: string; who: string[] }[] {
  return THEMES.map((t) => ({
    id: t.id,
    name: t.name,
    who: members.filter((m) => themesIn(m.intentions).has(t.id)).map((m) => m.id),
  })).filter((t) => t.who.length >= 2);
}
