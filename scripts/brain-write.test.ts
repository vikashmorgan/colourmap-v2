import { describe, expect, it, vi } from 'vitest';

const values = vi.fn().mockResolvedValue(undefined);
const insert = vi.fn(() => ({ values }));
vi.mock('@/lib/db/client', () => ({ getDb: () => ({ insert }) }));

import {
  AGENT_TAG,
  addEntry,
  MAX_ENTRIES,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  notebookId,
  parseEntries,
  run,
  toNotebookHtml,
  WriteError,
} from './brain-write';

const WHO = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';

describe('notebookId', () => {
  it('names a notebook the way the app does', () => {
    expect(notebookId('Cammino del cuore')).toBe('cammino_del_cuore');
    expect(notebookId('  Ideas ')).toBe('ideas');
  });
});

describe('toNotebookHtml', () => {
  it('writes one div per line, a blank line as a break, and escapes markup', () => {
    expect(toNotebookHtml('Rosso\n\nfuoco <3 & luce')).toBe(
      '<div>Rosso</div><div><br></div><div>fuoco &lt;3 &amp; luce</div>',
    );
    expect(toNotebookHtml('a\r\nb')).toBe('<div>a</div><div>b</div>');
  });
});

describe('parseEntries', () => {
  const one = { notebook: 'Cammino del cuore', title: ' 12 settembre ', text: 'Siamo tutti' };

  it('turns each entry into a notebook id, a trimmed title and the stored text', () => {
    expect(parseEntries(JSON.stringify([one]))).toEqual([
      { category: 'cammino_del_cuore', title: '12 settembre', content: '<div>Siamo tutti</div>' },
    ]);
  });

  it('rejects text that is not JSON, an empty list, or too many entries', () => {
    expect(() => parseEntries('nope')).toThrow('not valid JSON');
    expect(() => parseEntries('[]')).toThrow('non-empty JSON array');
    expect(() => parseEntries('{}')).toThrow('non-empty JSON array');
    expect(() => parseEntries(JSON.stringify(Array(MAX_ENTRIES + 1).fill(one)))).toThrow(
      `at most ${MAX_ENTRIES}`,
    );
  });

  it('rejects a missing notebook, title or text, and over-long ones', () => {
    expect(() => parseEntries(JSON.stringify([{ ...one, notebook: ' ' }]))).toThrow('notebook');
    expect(() => parseEntries(JSON.stringify([null]))).toThrow('notebook');
    expect(() => parseEntries(JSON.stringify([{ ...one, title: '' }]))).toThrow('title');
    expect(() =>
      parseEntries(JSON.stringify([{ ...one, title: 'x'.repeat(MAX_TITLE_LENGTH + 1) }])),
    ).toThrow('title is longer');
    expect(() => parseEntries(JSON.stringify([{ ...one, text: '  ' }]))).toThrow('text');
    expect(() =>
      parseEntries(JSON.stringify([{ ...one, text: 'x'.repeat(MAX_TEXT_LENGTH + 1) }])),
    ).toThrow('text is longer');
  });

  it('throws WriteError, so the CLI prints the message alone', () => {
    expect(() => parseEntries('nope')).toThrow(WriteError);
  });
});

describe('run', () => {
  const file = JSON.stringify([
    { notebook: 'Cammino del cuore', title: 'uno', text: 'a' },
    { notebook: 'Cammino del cuore', title: 'due', text: 'b' },
  ]);

  it('adds every entry for the user, and only adds', async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const log = vi.fn();
    const code = await run(
      ['bun', 'brain-write', 'e.json'],
      { BRAIN_USER_ID: WHO },
      {
        read: async () => file,
        add,
        log,
      },
    );
    expect(code).toBe(0);
    expect(add).toHaveBeenCalledTimes(2);
    expect(add.mock.calls[0]).toEqual([
      WHO,
      { category: 'cammino_del_cuore', title: 'uno', content: '<div>a</div>' },
    ]);
    expect(log).toHaveBeenCalledWith('2 entries added.');
  });

  it('needs a file and a user id, and adds nothing without them', async () => {
    const deps = { read: async () => file, add: vi.fn(), log: vi.fn() };
    await expect(run(['bun', 'brain-write'], { BRAIN_USER_ID: WHO }, deps)).rejects.toThrow(
      'usage',
    );
    await expect(run(['bun', 'brain-write', 'e.json'], {}, deps)).rejects.toThrow('BRAIN_USER_ID');
    await expect(
      run(['bun', 'brain-write', 'e.json'], { BRAIN_USER_ID: 'me' }, deps),
    ).rejects.toThrow('BRAIN_USER_ID');
    expect(deps.add).not.toHaveBeenCalled();
  });

  it('inserts for the user only, tagged so an added note is told apart from a typed one', async () => {
    await addEntry(WHO, { category: 'cammino_del_cuore', title: 'uno', content: '<div>a</div>' });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith({
      userId: WHO,
      category: 'cammino_del_cuore',
      title: 'uno',
      content: '<div>a</div>',
      tags: [AGENT_TAG],
    });
    expect(AGENT_TAG).toBe('from-agent');
  });
});
