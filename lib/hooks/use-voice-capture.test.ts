import { describe, expect, it } from 'vitest';

import { extensionFor, pickMimeType, storagePathFor } from './use-voice-capture';

/*
 * The hook's effects need a microphone, a bucket and a network, so what is
 * tested here is the pure part — the three decisions that are wrong silently.
 * A bad mime type throws at MediaRecorder construction on one browser only, and
 * a bad path writes a row pointing at nothing. Neither shows up in a UI test.
 */

describe('choosing what to record as', () => {
  it('prefers opus when the browser has it', () => {
    expect(pickMimeType(() => true)).toBe('audio/webm;codecs=opus');
  });

  it('falls back to mp4 for Safari', () => {
    /*
     * Safari records MP4 and nothing else. Asking for WebM there throws at
     * construction rather than degrading, which is how a recorder ends up
     * working everywhere except the phone it was built for.
     */
    expect(pickMimeType((type) => type === 'audio/mp4')).toBe('audio/mp4');
  });

  it('lets the browser choose when it supports nothing we named', () => {
    /*
     * Older iOS has no isTypeSupported at all. An empty string means "you
     * decide", which is the only thing that works there.
     */
    expect(pickMimeType(() => false)).toBe('');
  });
});

describe('naming the file', () => {
  it('matches the extension to what was actually recorded', () => {
    expect(extensionFor('audio/mp4')).toBe('mp4');
    expect(extensionFor('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionFor('audio/ogg')).toBe('ogg');
  });

  it('assumes webm when the browser said nothing', () => {
    expect(extensionFor('')).toBe('webm');
  });

  it('files audio under the owner own id', () => {
    /*
     * The bucket is shared with music recordings. The prefix is what keeps one
     * person's notes out of another's listing, and the API rejects any path
     * that does not start this way.
     */
    expect(storagePathFor('user-1', 1700000000000, 'audio/webm')).toBe(
      'user-1/voice/1700000000000.webm',
    );
  });

  it('keeps the extension honest for a Safari recording', () => {
    expect(storagePathFor('user-1', 1, 'audio/mp4')).toBe('user-1/voice/1.mp4');
  });
});
