'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Material = 'gold' | 'hologram' | 'stars';
type FigureDanceMove = 'still' | 'breath' | 'nod' | 'pulse';
type StarPattern =
  | 'still'
  | 'current'
  | 'spiral'
  | 'wave'
  | 'storm'
  | 'shimmer'
  | 'vortex'
  | 'scales'
  | 'nebula';
type LightingMode = 'low' | 'studio' | 'bright' | 'radiant';

export type FigureAsset = {
  key: string;
  label: string;
  url: string;
  goldColor?: string;
  hologramColor?: string;
  starColor?: string;
};

const SERIF = 'var(--font-serif)';
const MATERIALS: { key: Material; label: string }[] = [
  { key: 'gold', label: 'Metallic Gold' },
  { key: 'hologram', label: 'Hologram' },
  { key: 'stars', label: 'Stars' },
];

const HOLOGRAM_PALETTES: { key: string; label: string; main: string; emissive: string }[] = [
  { key: 'gold', label: 'Gold', main: '#FFD080', emissive: '#A06014' },
  { key: 'cyan', label: 'Cyan', main: '#8AE6FF', emissive: '#1860A0' },
  { key: 'violet', label: 'Violet', main: '#C8A8FF', emissive: '#5028A0' },
  { key: 'rose', label: 'Rose', main: '#FF9AB8', emissive: '#A02850' },
  { key: 'mint', label: 'Mint', main: '#9AE8C0', emissive: '#208060' },
  { key: 'fire', label: 'Fire', main: '#FFAA60', emissive: '#A03020' },
  { key: 'pure', label: 'Pure', main: '#F5F0E0', emissive: '#806848' },
];

const STAR_COUNT = 32000;
const STAR_PATTERNS: { key: StarPattern; label: string }[] = [
  { key: 'still', label: 'Still' },
  { key: 'current', label: 'Currents' },
  { key: 'spiral', label: 'Spiral' },
  { key: 'wave', label: 'Wave' },
  { key: 'storm', label: 'Storm' },
  { key: 'shimmer', label: 'Shimmer' },
  { key: 'vortex', label: 'Vortex' },
  { key: 'scales', label: 'Scales' },
  { key: 'nebula', label: 'Nebula' },
];
const FIGURE_DANCE_MOVES: { key: FigureDanceMove; label: string }[] = [
  { key: 'still', label: 'Still' },
  { key: 'breath', label: 'Breath' },
  { key: 'nod', label: 'Nod' },
  { key: 'pulse', label: 'Pulse' },
];
const LIGHTING_MODES: {
  key: LightingMode;
  label: string;
  exposure: number;
  keyLight: number;
  rim: number;
  ambient: number;
}[] = [
  { key: 'low', label: 'Low', exposure: 0.68, keyLight: 1.0, rim: 0.25, ambient: 0.08 },
  { key: 'studio', label: 'Studio', exposure: 1.15, keyLight: 3.2, rim: 1.4, ambient: 0.46 },
  { key: 'bright', label: 'Bright', exposure: 1.75, keyLight: 6.2, rim: 3.2, ambient: 0.9 },
  { key: 'radiant', label: 'Radiant', exposure: 2.35, keyLight: 9.5, rim: 5.8, ambient: 1.35 },
];

export default function GoldenGod({
  assetUrl = '/models/golden-god.obj',
  goldColor = '#E0A040',
  hologramColor = '#FFD080',
  starColor = '#FFE2A0',
}: {
  assetUrl?: string;
  goldColor?: string;
  hologramColor?: string;
  starColor?: string;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [material, setMaterial] = useState<Material>('stars');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [holoPaletteKey, setHoloPaletteKey] = useState<string>('gold');
  const [cameraDistance, setCameraDistance] = useState(3);
  const [starGlow, setStarGlow] = useState(0.5);
  const [starPattern, setStarPattern] = useState<StarPattern>('current');
  const [starAgitation, setStarAgitation] = useState(0.35);
  const [starScale, setStarScale] = useState(0.8);
  const [starHue, setStarHue] = useState(() => hexToHsl(starColor).h);
  const [starSaturation, setStarSaturation] = useState(70);
  const [starLightness, setStarLightness] = useState(35);
  const [lightingMode, setLightingMode] = useState<LightingMode>('studio');
  const [autoRotate, setAutoRotate] = useState(false);
  const [danceMove, setDanceMove] = useState<FigureDanceMove>('still');
  const [danceBpm, setDanceBpm] = useState(92);
  const [danceAmount, setDanceAmount] = useState(4);

  // Refs the animation loop reads. Material changes only swap which mesh is visible —
  // they don't tear the scene down.
  const meshRef = useRef<THREE.Mesh | null>(null);
  const hologramRef = useRef<THREE.Mesh | null>(null);
  const hologramMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const materialRef = useRef<Material>('stars');
  const cameraDistanceRef = useRef(3);
  const starGlowRef = useRef(0.5);
  const starPatternRef = useRef<StarPattern>('current');
  const starAgitationRef = useRef(0.35);
  const starScaleRef = useRef(0.8);
  const starHueRef = useRef(42);
  const starSaturationRef = useRef(70);
  const starLightnessRef = useRef(35);
  const lightingModeRef = useRef<LightingMode>('studio');
  const autoRotateRef = useRef(false);
  const danceMoveRef = useRef<FigureDanceMove>('still');
  const danceBpmRef = useRef(92);
  const danceAmountRef = useRef(4);
  cameraDistanceRef.current = cameraDistance;
  starGlowRef.current = starGlow;
  starPatternRef.current = starPattern;
  starAgitationRef.current = starAgitation;
  starScaleRef.current = starScale;
  starHueRef.current = starHue;
  starSaturationRef.current = starSaturation;
  starLightnessRef.current = starLightness;
  lightingModeRef.current = lightingMode;
  autoRotateRef.current = autoRotate;
  danceMoveRef.current = danceMove;
  danceBpmRef.current = danceBpm;
  danceAmountRef.current = danceAmount;

  const setActiveMaterial = useCallback((m: Material) => {
    setMaterial(m);
    materialRef.current = m;
    if (meshRef.current) meshRef.current.visible = m === 'gold';
    if (hologramRef.current) hologramRef.current.visible = m === 'hologram';
    if (starsRef.current) starsRef.current.visible = m === 'stars';
  }, []);

  const setHoloPalette = useCallback((key: string) => {
    const palette = HOLOGRAM_PALETTES.find((p) => p.key === key);
    if (!palette) return;
    setHoloPaletteKey(key);
    const mat = hologramMatRef.current;
    if (mat) {
      mat.color = new THREE.Color(palette.main);
      mat.emissive = new THREE.Color(palette.emissive);
      mat.needsUpdate = true;
    }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let frameId = 0;
    let disposed = false;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0A0604');

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 100);
    camera.position.set(0, 0, cameraDistanceRef.current);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = getLighting(lightingModeRef.current).exposure;
    mount.appendChild(renderer.domElement);

    // Warm key + rim lighting for the metallic look
    const key = new THREE.DirectionalLight(
      '#FFE2A8',
      getLighting(lightingModeRef.current).keyLight,
    );
    key.position.set(2, 2, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#B07020', getLighting(lightingModeRef.current).rim);
    rim.position.set(-3, 1, -2);
    scene.add(rim);
    const ambient = new THREE.AmbientLight('#3A2614', getLighting(lightingModeRef.current).ambient);
    scene.add(ambient);
    const fill = new THREE.PointLight('#FFF1B8', 0.9, 8);
    fill.position.set(0, -1.2, 2.4);
    scene.add(fill);

    const root = new THREE.Group();
    scene.add(root);

    const goldMat = new THREE.MeshStandardMaterial({
      color: goldColor,
      metalness: 1.0,
      roughness: 0.18,
      envMapIntensity: 1.2,
    });
    const hologramMat = new THREE.MeshPhysicalMaterial({
      color: hologramColor,
      metalness: 0.4,
      roughness: 0.05,
      transmission: 0.95,
      thickness: 0.4,
      ior: 1.42,
      transparent: true,
      opacity: 0.85,
      emissive: '#A06014',
      emissiveIntensity: 0.45,
    });
    hologramMatRef.current = hologramMat;

    let mesh: THREE.Mesh | null = null;
    let hologramMesh: THREE.Mesh | null = null;
    let starPoints: THREE.Points | null = null;

    const loader = new OBJLoader();
    loader.load(
      assetUrl,
      (group) => {
        if (disposed) return;

        group.updateMatrixWorld(true);
        const geometries: THREE.BufferGeometry[] = [];
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const sourceMesh = child as THREE.Mesh;
            const sourceGeom = sourceMesh.geometry.clone();
            sourceGeom.applyMatrix4(sourceMesh.matrixWorld);
            geometries.push(sourceGeom);
          }
        });
        const mergedGeom =
          geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
        for (const sourceGeom of geometries) {
          if (sourceGeom !== mergedGeom) sourceGeom.dispose();
        }
        if (!mergedGeom) {
          setStatus('error');
          setErrorMsg('No mesh found inside the OBJ.');
          return;
        }

        const geom = mergedGeom;
        geom.computeVertexNormals();
        geom.center();

        // Normalise scale so the figure fits the viewport regardless of source units.
        geom.computeBoundingSphere();
        const radius = geom.boundingSphere?.radius ?? 1;
        const scale = 1 / radius;
        geom.scale(scale, scale, scale);

        mesh = new THREE.Mesh(geom, goldMat);
        mesh.visible = materialRef.current === 'gold';
        meshRef.current = mesh;
        root.add(mesh);

        hologramMesh = new THREE.Mesh(geom, hologramMat);
        hologramMesh.visible = materialRef.current === 'hologram';
        hologramRef.current = hologramMesh;
        root.add(hologramMesh);

        // Build the star-particle sampling of the same surface.
        const sampler = new MeshSurfaceSampler(mesh).build();
        const positions = new Float32Array(STAR_COUNT * 3);
        const tmp = new THREE.Vector3();
        for (let i = 0; i < STAR_COUNT; i += 1) {
          sampler.sample(tmp);
          positions[i * 3] = tmp.x;
          positions[i * 3 + 1] = tmp.y;
          positions[i * 3 + 2] = tmp.z;
        }
        const starGeom = new THREE.BufferGeometry();
        starGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starMat = new THREE.PointsMaterial({
          color: starHsl(starHueRef.current, starSaturationRef.current, starLightnessRef.current),
          size: 0.006,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        starPoints = new THREE.Points(starGeom, starMat);
        starPoints.userData.basePositions = Float32Array.from(positions);
        starPoints.visible = materialRef.current === 'stars';
        starsRef.current = starPoints;
        root.add(starPoints);

        setStatus('ready');
      },
      undefined,
      (err) => {
        if (disposed) return;
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load model.');
      },
    );

    // Drag-to-rotate (Level A interactivity)
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let targetRotY = 0;
    let targetRotX = 0;
    let currentRotY = 0;
    let currentRotX = 0;
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      mount.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      targetRotY += (e.clientX - lastX) * 0.01;
      targetRotX += (e.clientY - lastY) * 0.01;
      targetRotX = Math.max(-0.8, Math.min(0.8, targetRotX));
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      mount.releasePointerCapture(e.pointerId);
    };
    mount.addEventListener('pointerdown', onPointerDown);
    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerup', onPointerUp);
    mount.addEventListener('pointercancel', onPointerUp);

    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      currentRotY += (targetRotY - currentRotY) * 0.15;
      currentRotX += (targetRotX - currentRotX) * 0.15;
      const move = danceMoveRef.current;
      const moveAmount = move === 'still' ? 0 : danceAmountRef.current / 10;
      const beat = beatPulse(t, danceBpmRef.current);
      const groove = Math.sin(beatPhase(t, danceBpmRef.current) * Math.PI * 2);
      const nod = move === 'nod' ? groove * 0.12 * moveAmount : 0;
      const beatBob = move === 'nod' || move === 'pulse' ? beat * 0.035 * moveAmount : 0;
      const beatScale = move === 'breath' || move === 'pulse' ? beat * 0.05 * moveAmount : 0;
      // When idle, slow auto-rotate. When dragging, follow finger.
      root.rotation.y = currentRotY + (isDragging || !autoRotateRef.current ? 0 : t * 0.12);
      root.rotation.x = currentRotX + nod;
      root.position.y = beatBob;
      // Subtle breathing
      const breath = 1 + Math.sin(t * 0.8) * 0.012 + beatScale;
      root.scale.setScalar(breath);
      const lighting = getLighting(lightingModeRef.current);
      renderer.toneMappingExposure += (lighting.exposure - renderer.toneMappingExposure) * 0.08;
      key.intensity += (lighting.keyLight - key.intensity) * 0.08;
      rim.intensity += (lighting.rim - rim.intensity) * 0.08;
      ambient.intensity += (lighting.ambient - ambient.intensity) * 0.08;
      fill.intensity += ((lighting.keyLight + lighting.rim) * 0.18 - fill.intensity) * 0.08;
      const glowTarget =
        lightingModeRef.current === 'radiant'
          ? 0.35
          : lightingModeRef.current === 'bright'
            ? 0.16
            : 0.02;
      goldMat.emissive = new THREE.Color('#B06A18');
      goldMat.emissiveIntensity += (glowTarget - goldMat.emissiveIntensity) * 0.08;
      goldMat.envMapIntensity += (0.45 + lighting.exposure * 1.25 - goldMat.envMapIntensity) * 0.08;
      scene.background = new THREE.Color(
        lightingModeRef.current === 'low'
          ? '#050302'
          : lightingModeRef.current === 'studio'
            ? '#0A0604'
            : lightingModeRef.current === 'bright'
              ? '#100905'
              : '#180D05',
      );
      // Stars drift slightly outward and back
      if (starPoints) {
        camera.position.z += (cameraDistanceRef.current - camera.position.z) * 0.08;
        starPoints.rotation.y = autoRotateRef.current ? t * 0.05 : 0;
        const starMat = starPoints.material as THREE.PointsMaterial;
        starMat.color = starGlowColor(
          starHueRef.current,
          starSaturationRef.current,
          starLightnessRef.current,
          starGlowRef.current,
        );
        starMat.size = 0.005 + starGlowRef.current * 0.0048 + beat * moveAmount * 0.0035;
        starMat.opacity = Math.min(
          0.98,
          0.52 + starGlowRef.current * 0.15 + beat * moveAmount * 0.1,
        );
        animateStarPattern(
          starPoints,
          t,
          starPatternRef.current,
          starAgitationRef.current,
          starScaleRef.current,
        );
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      mount.removeEventListener('pointerdown', onPointerDown);
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerup', onPointerUp);
      mount.removeEventListener('pointercancel', onPointerUp);
      renderer.dispose();
      goldMat.dispose();
      hologramMat.dispose();
      if (mesh) mesh.geometry.dispose();
      if (starPoints) {
        starPoints.geometry.dispose();
        (starPoints.material as THREE.PointsMaterial).dispose();
      }
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [assetUrl, goldColor, hologramColor]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 400,
        background: '#0A0604',
      }}
    >
      <div ref={mountRef} style={{ position: 'absolute', inset: 0, cursor: 'grab' }} />
      {status === 'loading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(240,216,152,0.6)',
            fontFamily: SERIF,
            fontSize: 13,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          loading golden god…
        </div>
      )}
      {status === 'error' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#E78878',
            fontFamily: SERIF,
            fontSize: 13,
            padding: 20,
            textAlign: 'center',
          }}
        >
          {errorMsg ?? 'Failed to load.'}
        </div>
      )}
      {material === 'hologram' && (
        <div
          style={{
            position: 'absolute',
            bottom: 58,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
            padding: '0 18px',
          }}
        >
          {HOLOGRAM_PALETTES.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setHoloPalette(p.key)}
              aria-pressed={holoPaletteKey === p.key}
              aria-label={`Hologram ${p.label}`}
              title={p.label}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                cursor: 'pointer',
                background: p.main,
                border: `2px solid ${holoPaletteKey === p.key ? '#FFF' : 'rgba(0,0,0,0.5)'}`,
                boxShadow:
                  holoPaletteKey === p.key
                    ? `0 0 0 2px rgba(255,255,255,0.55), 0 0 12px ${p.main}`
                    : '0 0 0 1px rgba(0,0,0,0.3)',
                padding: 0,
                transition: 'box-shadow 150ms',
              }}
            />
          ))}
        </div>
      )}
      {material === 'gold' && (
        <div
          style={{
            position: 'absolute',
            bottom: 58,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
            padding: '0 18px',
            fontFamily: SERIF,
            color: 'rgba(240,216,152,0.78)',
            fontSize: 11,
          }}
        >
          <span style={{ letterSpacing: '0.16em', textTransform: 'uppercase' }}>lighting</span>
          {LIGHTING_MODES.map((mode) => (
            <button
              key={mode.key}
              type="button"
              onClick={() => setLightingMode(mode.key)}
              aria-pressed={lightingMode === mode.key}
              style={smallPillStyle(lightingMode === mode.key)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      )}
      {material === 'stars' && (
        <div
          style={{
            position: 'absolute',
            bottom: 58,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            flexWrap: 'wrap',
            padding: '0 18px',
            fontFamily: SERIF,
            color: 'rgba(240,216,152,0.78)',
            fontSize: 11,
          }}
        >
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <SceneSlider
              label="zoom"
              value={cameraDistance}
              min={1.8}
              max={5.2}
              step={0.1}
              onChange={setCameraDistance}
            />
            <SceneSlider
              label="glow"
              value={starGlow}
              min={0.2}
              max={4.2}
              step={0.1}
              onChange={setStarGlow}
            />
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            {HOLOGRAM_PALETTES.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  const hsl = hexToHsl(p.main);
                  setStarHue(hsl.h);
                  setStarSaturation(hsl.s);
                  setStarLightness(hsl.l);
                }}
                aria-label={`Star colour ${p.label}`}
                title={p.label}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: p.main,
                  border: '1px solid rgba(255,255,255,0.65)',
                  boxShadow: `0 0 ${8 + starGlow * 5}px ${p.main}`,
                  padding: 0,
                }}
              />
            ))}
            <span
              aria-hidden="true"
              title="Current star light"
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: starHsl(starHue, starSaturation, starLightness),
                border: '1px solid rgba(255,255,255,0.76)',
                boxShadow: `0 0 ${8 + starGlow * 6}px ${starHsl(starHue, starSaturation, starLightness)}`,
              }}
            />
            <SceneSlider
              label="hue"
              value={starHue}
              min={0}
              max={360}
              step={1}
              onChange={setStarHue}
            />
            <SceneSlider
              label="sat"
              value={starSaturation}
              min={0}
              max={100}
              step={1}
              onChange={setStarSaturation}
            />
            <SceneSlider
              label="light"
              value={starLightness}
              min={25}
              max={95}
              step={1}
              onChange={setStarLightness}
            />
          </div>
          <section
            aria-label="Star movement menu"
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <span style={{ letterSpacing: '0.16em', textTransform: 'uppercase' }}>movement</span>
            {STAR_PATTERNS.map((pattern) => (
              <button
                key={pattern.key}
                type="button"
                onClick={() => setStarPattern(pattern.key)}
                aria-pressed={starPattern === pattern.key}
                style={smallPillStyle(starPattern === pattern.key)}
              >
                {pattern.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAutoRotate((current) => !current)}
              aria-pressed={!autoRotate}
              style={smallPillStyle(!autoRotate)}
            >
              Static
            </button>
          </section>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <SceneSlider
              label="agitate"
              value={starAgitation}
              min={0}
              max={2.5}
              step={0.1}
              onChange={setStarAgitation}
            />
            <SceneSlider
              label="scale"
              value={starScale}
              min={0.4}
              max={3}
              step={0.1}
              onChange={setStarScale}
            />
          </div>
        </div>
      )}
      <section
        aria-label="BPM figure movement"
        style={{
          position: 'absolute',
          top: 14,
          left: 0,
          right: 0,
          zIndex: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          padding: '0 18px',
          fontFamily: SERIF,
          color: 'rgba(240,216,152,0.78)',
          fontSize: 11,
        }}
      >
        <span style={{ letterSpacing: '0.16em', textTransform: 'uppercase' }}>BPM move</span>
        {FIGURE_DANCE_MOVES.map((move) => (
          <button
            key={move.key}
            type="button"
            onClick={() => setDanceMove(move.key)}
            aria-pressed={danceMove === move.key}
            style={smallPillStyle(danceMove === move.key)}
          >
            {move.label}
          </button>
        ))}
        <SceneSlider
          label="bpm"
          value={danceBpm}
          min={50}
          max={180}
          step={1}
          onChange={setDanceBpm}
        />
        <SceneSlider
          label="amount"
          value={danceAmount}
          min={0}
          max={10}
          step={0.5}
          onChange={setDanceAmount}
        />
      </section>
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {MATERIALS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setActiveMaterial(m.key)}
            aria-pressed={material === m.key}
            style={{
              background: material === m.key ? 'rgba(255,200,100,0.18)' : 'rgba(0,0,0,0.4)',
              border: `1px solid ${material === m.key ? 'rgba(255,200,100,0.55)' : 'rgba(240,216,152,0.25)'}`,
              borderRadius: 999,
              color: material === m.key ? '#FFD080' : 'rgba(240,216,152,0.7)',
              fontFamily: SERIF,
              fontSize: 12,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              padding: '6px 14px',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function animateStarPattern(
  points: THREE.Points,
  t: number,
  pattern: StarPattern,
  agitation: number,
  flowScale: number,
) {
  const base = points.userData.basePositions as Float32Array | undefined;
  if (!base) return;
  const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;
  const amp = agitation * 0.035 * flowScale;

  for (let i = 0; i < base.length; i += 3) {
    const x = base[i];
    const y = base[i + 1];
    const z = base[i + 2];
    let nx = x;
    let ny = y;
    let nz = z;

    if (pattern === 'current') {
      nx += Math.sin(t * 0.8 + y * 4.5 + z * 2.2) * amp * 0.5;
      ny += Math.sin(t * 1.2 + x * 5.2) * amp;
      nz += Math.cos(t * 0.9 + y * 3.4) * amp * 0.45;
    } else if (pattern === 'spiral') {
      const angle = Math.atan2(z, x);
      const radius = Math.sqrt(x * x + z * z);
      const swirl = angle + Math.sin(t * 0.55 + y * 4.2) * amp * 2.6;
      nx = Math.cos(swirl) * radius;
      nz = Math.sin(swirl) * radius;
      ny += Math.sin(t * 0.7 + radius * 6) * amp * 0.5;
    } else if (pattern === 'wave') {
      ny += Math.sin(t * 1.6 + x * 7.5) * amp * 1.35;
      nz += Math.cos(t * 1.1 + y * 5.5) * amp * 0.6;
    } else if (pattern === 'storm') {
      nx += Math.sin(t * 2.1 + y * 9.1 + z * 3.7) * amp * 1.35;
      ny += Math.cos(t * 1.8 + x * 8.4) * amp * 1.1;
      nz += Math.sin(t * 2.4 + x * 3.1 + y * 6.6) * amp * 1.35;
    } else if (pattern === 'shimmer') {
      const local = Math.sin(t * 2.4 + x * 18.0 + y * 9.0 + z * 13.0) * amp * 0.22;
      nx += x * local;
      ny += y * local;
      nz += z * local;
    } else if (pattern === 'vortex') {
      const radius = Math.max(0.001, Math.sqrt(x * x + z * z));
      const tangentX = -z / radius;
      const tangentZ = x / radius;
      const drift = Math.sin(t * 1.1 + y * 7.0 + radius * 5.0) * amp * 0.55;
      nx += tangentX * drift;
      nz += tangentZ * drift;
      ny += Math.cos(t * 0.9 + radius * 10.0) * amp * 0.12;
    } else if (pattern === 'scales') {
      const bands = Math.sin((y + 1.0) * 18.0 + t * 1.5);
      const ribs = Math.cos(Math.atan2(z, x) * 10.0 + t * 0.8);
      const shell = Math.max(0, bands * ribs) * amp * 0.28;
      nx += x * shell;
      ny += Math.sin(t * 1.4 + x * 12.0) * amp * 0.08;
      nz += z * shell;
    } else if (pattern === 'nebula') {
      nx += Math.sin(t * 0.9 + x * 11.0 + y * 3.0) * amp * 0.32;
      ny += Math.cos(t * 1.0 + y * 12.0 + z * 2.0) * amp * 0.32;
      nz += Math.sin(t * 0.8 + z * 11.0 + x * 3.0) * amp * 0.32;
    }

    arr[i] = nx;
    arr[i + 1] = ny;
    arr[i + 2] = nz;
  }
  attr.needsUpdate = true;
}

function starHsl(hue: number, saturation: number, lightness: number) {
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function starGlowColor(hue: number, saturation: number, lightness: number, glow: number) {
  return new THREE.Color(
    starHsl(hue, saturation, Math.min(98, lightness + glow * 3)),
  ).multiplyScalar(1.1 + glow * 0.42);
}

function beatPhase(t: number, bpm: number) {
  return ((t * Math.max(1, bpm)) / 60) % 1;
}

function beatPulse(t: number, bpm: number) {
  return (0.5 - Math.cos(beatPhase(t, bpm) * Math.PI * 2) * 0.5) ** 2.8;
}

function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: Math.round(h * 60), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function getLighting(mode: LightingMode) {
  return LIGHTING_MODES.find((entry) => entry.key === mode) ?? LIGHTING_MODES[1];
}

function smallPillStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? 'rgba(255,200,100,0.18)' : 'rgba(0,0,0,0.4)',
    border: `1px solid ${active ? 'rgba(255,200,100,0.55)' : 'rgba(240,216,152,0.25)'}`,
    borderRadius: 999,
    color: active ? '#FFD080' : 'rgba(240,216,152,0.7)',
    fontFamily: SERIF,
    fontSize: 11,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    padding: '4px 10px',
  };
}

function SceneSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ letterSpacing: '0.16em', textTransform: 'uppercase' }}>{label}</span>
      <input
        aria-label={`${label} slider`}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ accentColor: '#FFD080', width: 132 }}
      />
      <span style={{ minWidth: 32 }}>{value.toFixed(1)}</span>
    </label>
  );
}
