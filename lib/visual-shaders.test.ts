import { describe, expect, it } from 'vitest';

import {
  isOilMode,
  isShaderVisualMode,
  OIL_MODES,
  SHADER_FRAGMENTS,
  SHADER_UNIFORM_NAMES,
  SHADER_VERTEX,
} from './visual-shaders';

describe('visual shaders', () => {
  it('gives every shader mode a fragment with a main and a colour output', () => {
    for (const [mode, src] of Object.entries(SHADER_FRAGMENTS)) {
      expect(src, mode).toContain('void main()');
      expect(src, mode).toContain('gl_FragColor');
    }
  });

  it('declares every uniform the builder sets', () => {
    for (const src of Object.values(SHADER_FRAGMENTS)) {
      for (const name of SHADER_UNIFORM_NAMES) {
        expect(src).toMatch(new RegExp(`uniform \\w+ ${name};`));
      }
    }
  });

  it('feeds fragments the radius-unit position', () => {
    expect(SHADER_VERTEX).toContain('varying vec2 vP');
    for (const src of Object.values(SHADER_FRAGMENTS)) expect(src).toContain('varying vec2 vP');
  });

  it('fades every shader at the rim', () => {
    for (const [mode, src] of Object.entries(SHADER_FRAGMENTS)) {
      expect(src.split('void main()')[1], mode).toContain('rimFade(');
    }
  });

  it('treats every oil as a shader mode, and only oils as oils', () => {
    for (const mode of OIL_MODES) {
      expect(isShaderVisualMode(mode)).toBe(true);
      expect(isOilMode(mode)).toBe(true);
    }
    expect(isOilMode('shadertunnel')).toBe(false);
    expect(isShaderVisualMode('shadertunnel')).toBe(true);
    expect(isShaderVisualMode('tunnel')).toBe(false);
    expect(isShaderVisualMode('toString')).toBe(false);
  });

  it('folds Rorschach oils into mirrors before drawing ink', () => {
    expect(SHADER_FRAGMENTS.rorschach).toContain('p.x = abs(p.x)');
  });
});
