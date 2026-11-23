import { describe, expect, it } from 'vitest';

import { DEMO_MEMBERS } from './model';
import { buildPrompt, describeMember, SYSTEM_PROMPT } from './prompt';

describe('collective prompt', () => {
  it('describes a member from their profile', () => {
    const text = describeMember(DEMO_MEMBERS[1]);
    expect(text).toContain('Martin (Architect)');
    expect(text).toContain('good at: software engineering; product strategy; data');
  });

  it('marks empty answers as not shared', () => {
    expect(describeMember({ ...DEMO_MEMBERS[0], style: '', places: [] })).toContain(
      'most comfortable in: not shared',
    );
  });

  it('includes the people, the links the map found and the question', () => {
    const text = buildPrompt(DEMO_MEMBERS.slice(0, 2), 'What could we build?');
    expect(text).toContain('The combination (2 people)');
    expect(text).toContain('Vic and Martin: both want');
    expect(text).toContain('Their question: What could we build?');
  });

  it('says when there are no links yet', () => {
    expect(buildPrompt([DEMO_MEMBERS[0]], 'Who am I missing?')).toContain('- none yet');
  });

  it('asks Claude not to invent or rank people', () => {
    expect(SYSTEM_PROMPT).toContain('Never invent facts');
    expect(SYSTEM_PROMPT).toContain('Never rank people');
  });
});
