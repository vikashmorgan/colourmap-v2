import type { Member } from './model';

export type AskOutcome =
  | { kind: 'done'; text: string }
  | { kind: 'signin' }
  | { kind: 'error'; message: string };

/** Streams Claude's answer about a combination, calling onText with the text so far. */
export async function askCollective(
  members: Member[],
  question: string,
  onText: (text: string) => void,
  fetcher: typeof fetch = fetch,
): Promise<AskOutcome> {
  let res: Response;
  try {
    res = await fetcher('/api/collective/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members, question }),
    });
  } catch {
    return { kind: 'error', message: 'No connection. Try again in a moment.' };
  }
  if (res.status === 401) return { kind: 'signin' };
  if (!res.ok || !res.body) {
    const message = (await res.text().catch(() => '')) || 'Claude could not answer right now.';
    return { kind: 'error', message };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onText(text);
  }
  return { kind: 'done', text };
}
