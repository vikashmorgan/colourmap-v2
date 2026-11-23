/*
 * A stand-in for the Web Audio API in tests (jsdom has none): records what is made and what each
 * parameter was asked to do, and plays nothing.
 */

export class FakeParam {
  value = 0;
  calls: [string, number, number][] = [];
  setValueAtTime(v: number, t: number) {
    this.value = v;
    this.calls.push(['set', v, t]);
    return this;
  }
  setTargetAtTime(v: number, t: number) {
    this.value = v;
    this.calls.push(['target', v, t]);
    return this;
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.value = v;
    this.calls.push(['linear', v, t]);
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.value = v;
    this.calls.push(['exp', v, t]);
    return this;
  }
}

export class FakeNode {
  kind: string;
  type = '';
  Q = new FakeParam();
  gain = new FakeParam();
  frequency = new FakeParam();
  detune = new FakeParam();
  threshold = new FakeParam();
  knee = new FakeParam();
  ratio = new FakeParam();
  attack = new FakeParam();
  release = new FakeParam();
  buffer: unknown = null;
  loop = false;
  started = false;
  outs: unknown[] = [];
  constructor(kind: string) {
    this.kind = kind;
  }
  connect<T>(n: T): T {
    this.outs.push(n);
    return n;
  }
  start() {
    this.started = true;
  }
  stop() {}
}

export class FakeAudioContext {
  static made: FakeAudioContext[] = [];
  state: 'running' | 'suspended' | 'closed' = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new FakeNode('destination');
  nodes: FakeNode[] = [];
  constructor() {
    FakeAudioContext.made.push(this);
  }
  private make(kind: string) {
    const n = new FakeNode(kind);
    this.nodes.push(n);
    return n;
  }
  createGain() {
    return this.make('gain');
  }
  createOscillator() {
    return this.make('osc');
  }
  createBiquadFilter() {
    return this.make('filter');
  }
  createDynamicsCompressor() {
    return this.make('compressor');
  }
  createBufferSource() {
    return this.make('source');
  }
  createBuffer(_ch: number, len: number) {
    const data = new Float32Array(len);
    return { getChannelData: () => data };
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
  /** Oscillators made after the always-on graph: the one-shot tones. */
  oscs() {
    return this.nodes.filter((n) => n.kind === 'osc');
  }
}
