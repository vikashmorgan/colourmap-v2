// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined') {
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

vi.mock('three', () => {
  class FakeMesh {
    position = { set: vi.fn(), clone: vi.fn(() => ({})), y: 0, lerp: vi.fn() };
    scale = { set: vi.fn(), lerp: vi.fn() };
    rotation = { x: 0 };
    userData: Record<string, unknown> = {};
  }
  class FakeColor {
    constructor() {}
    setHSL() {
      return this;
    }
    clone() {
      return this;
    }
    multiplyScalar() {
      return this;
    }
  }
  class FakeRenderer {
    domElement = document.createElement('canvas');
    setSize() {}
    setPixelRatio() {}
    render() {}
    dispose() {}
  }
  class FakeScene {
    background = new FakeColor();
    fog: unknown = null;
    add() {}
    traverse() {}
  }
  class FakeCamera {
    position = { set: vi.fn() };
    aspect = 1;
    lookAt() {}
    updateProjectionMatrix() {}
  }
  class FakeRaycaster {
    setFromCamera() {}
    intersectObjects() {
      return [];
    }
  }
  return {
    Scene: FakeScene,
    PerspectiveCamera: FakeCamera,
    WebGLRenderer: FakeRenderer,
    AmbientLight: class {},
    PointLight: class {
      position = { set: vi.fn() };
    },
    Mesh: FakeMesh,
    SphereGeometry: class {},
    RingGeometry: class {},
    BufferGeometry: class {
      setFromPoints() {
        return this;
      }
    },
    Line: class {},
    LineBasicMaterial: class {},
    MeshBasicMaterial: class {},
    MeshStandardMaterial: class {},
    Group: class {
      add() {}
    },
    Color: FakeColor,
    Fog: class {},
    DoubleSide: 2,
    Vector2: class {
      x = 0;
      y = 0;
    },
    Vector3: class {
      constructor(
        public x = 0,
        public y = 0,
        public z = 0,
      ) {}
    },
    Raycaster: FakeRaycaster,
    CanvasTexture: class {},
    SpriteMaterial: class {},
    Sprite: class {
      position = { set: vi.fn() };
      scale = { set: vi.fn() };
    },
    Object3D: class {
      position = { set: vi.fn() };
      scale = { set: vi.fn() };
    },
    LinearFilter: 1,
  };
});

import GeopoliticsSpace from './GeopoliticsSpace';

describe('GeopoliticsSpace', () => {
  afterEach(() => cleanup());

  it('mounts the 3D shell and the orbit hint', () => {
    render(<GeopoliticsSpace />);
    expect(screen.getByTestId('geopolitics-space')).toBeDefined();
    expect(screen.getByText(/Drag to orbit/i)).toBeDefined();
  });
});
