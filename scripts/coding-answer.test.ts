import { describe, expect, it, vi } from 'vitest';
import { AnswerError, MAX_ANSWER_LENGTH, parseAnswers, run } from './coding-answer';

const ID = '11111111-2222-4333-8444-555555555555';
const ID2 = '66666666-7777-4888-9999-aaaaaaaaaaaa';
const WHO = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';

describe('parseAnswers', () => {
  it('reads a list of id and answer, trimming the answer', () => {
    expect(parseAnswers(JSON.stringify([{ id: ID, answer: '  because  ' }]))).toEqual([
      { id: ID, answer: 'because' },
    ]);
  });

  it('rejects text that is not JSON', () => {
    expect(() => parseAnswers('nope')).toThrow('not valid JSON');
  });

  it('rejects an empty list or a non-list', () => {
    expect(() => parseAnswers('[]')).toThrow('non-empty JSON array');
    expect(() => parseAnswers('{}')).toThrow('non-empty JSON array');
  });

  it('rejects a bad id, a repeated id, and an empty or too long answer', () => {
    expect(() => parseAnswers(JSON.stringify([{ id: 'x', answer: 'a' }]))).toThrow('note uuid');
    expect(() => parseAnswers(JSON.stringify([null]))).toThrow('note uuid');
    expect(() =>
      parseAnswers(
        JSON.stringify([
          { id: ID, answer: 'a' },
          { id: ID, answer: 'b' },
        ]),
      ),
    ).toThrow('appears twice');
    expect(() => parseAnswers(JSON.stringify([{ id: ID, answer: '   ' }]))).toThrow(
      'non-empty text',
    );
    expect(() =>
      parseAnswers(JSON.stringify([{ id: ID, answer: 'x'.repeat(MAX_ANSWER_LENGTH + 1) }])),
    ).toThrow('longer than');
  });

  it('throws AnswerError, so the CLI prints the message alone', () => {
    expect(() => parseAnswers('nope')).toThrow(AnswerError);
  });
});

describe('run', () => {
  const file = JSON.stringify([
    { id: ID, answer: 'one' },
    { id: ID2, answer: 'two' },
  ]);

  it('writes every answer for the user and reports the count', async () => {
    const write = vi.fn().mockResolvedValue(true);
    const log = vi.fn();
    const code = await run(
      ['bun', 'coding-answer', 'a.json'],
      { BRAIN_USER_ID: WHO },
      {
        read: async () => file,
        write,
        log,
      },
    );
    expect(code).toBe(0);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write.mock.calls[0][0]).toBe(WHO);
    expect(write.mock.calls[0][1]).toEqual({ id: ID, answer: 'one' });
    expect(log).toHaveBeenCalledWith('2 of 2 answers written.');
  });

  it('names notes that do not belong to the user and exits 1', async () => {
    const write = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const log = vi.fn();
    const code = await run(
      ['bun', 'coding-answer', 'a.json'],
      { BRAIN_USER_ID: WHO },
      {
        read: async () => file,
        write,
        log,
      },
    );
    expect(code).toBe(1);
    expect(log).toHaveBeenCalledWith('1 of 2 answers written.');
    expect(log).toHaveBeenCalledWith(`Not found for this user: ${ID2}`);
  });

  it('needs a file and a user id', async () => {
    const deps = { read: async () => file, write: vi.fn(), log: vi.fn() };
    await expect(run(['bun', 'coding-answer'], { BRAIN_USER_ID: WHO }, deps)).rejects.toThrow(
      'usage',
    );
    await expect(run(['bun', 'coding-answer', 'a.json'], {}, deps)).rejects.toThrow(
      'BRAIN_USER_ID',
    );
    await expect(
      run(['bun', 'coding-answer', 'a.json'], { BRAIN_USER_ID: 'me' }, deps),
    ).rejects.toThrow('BRAIN_USER_ID');
    expect(deps.write).not.toHaveBeenCalled();
  });
});
