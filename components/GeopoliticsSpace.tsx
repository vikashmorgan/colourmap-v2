'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GEOPOLITICS_CATEGORIES, locatePage } from '@/lib/geopolitics-content';
import { buildGraph, type Graph, type GraphNode } from '@/lib/geopolitics-graph';
import EducationModeSwitch from './EducationModeSwitch';

const TIER_Z: Record<string, number> = {
  now: 0,
  decade: -220,
  horizon: -440,
};

const TIER_LABEL: Record<string, string> = {
  now: 'NOW',
  decade: 'DECADE',
  horizon: 'HORIZON',
};

const CATEGORY_HUE: Record<string, number> = {
  'hormuz-crisis': 12,
  'middle-east': 28,
  'shipping-industry': 40,
  'alliances-reshuffle': 50,
  'critical-materials': 36,
  'world-2050': 58,
  africa: 22,
};

type Props = {
  onSwitchToSelf?: () => void;
  onOpenPage?: (slug: string) => void;
};

export default function GeopoliticsSpace({ onSwitchToSelf, onOpenPage }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const selectedRef = useRef<GraphNode | null>(null);
  const onOpenPageRef = useRef<typeof onOpenPage>(onOpenPage);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    onOpenPageRef.current = onOpenPage;
  }, [onOpenPage]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const graph = buildGraph();
    const positions = layoutNodes(graph);

    // Scene + camera + renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1d130a');
    scene.fog = new THREE.Fog('#1d130a', 280, 900);

    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.1,
      2000,
    );
    camera.position.set(0, 90, 360);
    camera.lookAt(0, 0, -220);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    // Lighting (warm)
    const ambient = new THREE.AmbientLight(0xffe6aa, 0.55);
    scene.add(ambient);
    const point = new THREE.PointLight(0xfff5d6, 1.6, 800);
    point.position.set(80, 220, 250);
    scene.add(point);

    // Tier rings (the bands)
    const tierLabelMeshes: THREE.Object3D[] = [];
    for (const [tier, z] of Object.entries(TIER_Z)) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(200, 202, 96),
        new THREE.MeshBasicMaterial({
          color: 0xb06b1c,
          transparent: true,
          opacity: 0.32,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 0, z);
      scene.add(ring);
      tierLabelMeshes.push(makeLabelSprite(TIER_LABEL[tier], 0xffd693, 0.92));
      const last = tierLabelMeshes[tierLabelMeshes.length - 1];
      last.position.set(0, 160, z);
      last.scale.set(86, 36, 1);
      scene.add(last);
    }

    // Nodes
    const nodeMeshes: THREE.Mesh[] = [];
    const nodeBySlug = new Map<string, { mesh: THREE.Mesh; node: GraphNode }>();
    for (const node of graph.nodes) {
      const pos = positions.get(node.slug);
      if (!pos) continue;
      const category = locatePage(node.slug)?.category;
      const hue = CATEGORY_HUE[category?.slug ?? ''] ?? 36;
      const colour = new THREE.Color().setHSL(hue / 360, 0.55, 0.62);
      const size = 6 + Math.min(8, node.incoming + node.outgoing);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 24, 18),
        new THREE.MeshStandardMaterial({
          color: colour,
          emissive: colour.clone().multiplyScalar(0.3),
          roughness: 0.4,
          metalness: 0.15,
        }),
      );
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.userData = { slug: node.slug };
      scene.add(mesh);
      nodeMeshes.push(mesh);
      nodeBySlug.set(node.slug, { mesh, node });
    }

    // Edges
    const edgeGroup = new THREE.Group();
    for (const edge of graph.edges) {
      const from = nodeBySlug.get(edge.from);
      const to = nodeBySlug.get(edge.to);
      if (!from || !to) continue;
      const geo = new THREE.BufferGeometry().setFromPoints([
        from.mesh.position.clone(),
        to.mesh.position.clone(),
      ]);
      const colour = edge.kind === 'feedsInto' ? 0xb06b1c : 0x7a4b18;
      const mat = new THREE.LineBasicMaterial({
        color: colour,
        transparent: true,
        opacity: edge.kind === 'related' ? 0.18 : 0.42,
      });
      edgeGroup.add(new THREE.Line(geo, mat));
    }
    scene.add(edgeGroup);

    // Orbit (mouse / touch)
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let theta = 0;
    let phi = Math.PI / 3;
    const distance = 480;
    const target = new THREE.Vector3(0, 0, -220);

    function updateCamera() {
      camera.position.set(
        target.x + distance * Math.sin(phi) * Math.sin(theta),
        target.y + distance * Math.cos(phi),
        target.z + distance * Math.sin(phi) * Math.cos(theta),
      );
      camera.lookAt(target);
    }
    updateCamera();

    function onPointerDown(event: PointerEvent) {
      isDragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      (event.target as Element).setPointerCapture?.(event.pointerId);
    }
    function onPointerMove(event: PointerEvent) {
      if (isDragging) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;
        theta -= dx * 0.005;
        phi = Math.min(Math.PI - 0.2, Math.max(0.2, phi - dy * 0.005));
        updateCamera();
      } else {
        pickHover(event);
      }
    }
    function onPointerUp() {
      isDragging = false;
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    function pickHover(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(nodeMeshes, false);
      if (hits.length > 0) {
        const slug = (hits[0].object as THREE.Mesh).userData.slug as string;
        const located = locatePage(slug);
        setHovered(located?.page ? { ...nodeBySlug.get(slug)!.node } : null);
      } else {
        setHovered(null);
      }
    }

    function onClick(event: PointerEvent) {
      if (isDragging) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(nodeMeshes, false);
      if (hits.length > 0) {
        const slug = (hits[0].object as THREE.Mesh).userData.slug as string;
        const node = nodeBySlug.get(slug)?.node ?? null;
        if (selectedRef.current?.slug === slug) {
          onOpenPageRef.current?.(slug);
        } else {
          setSelected(node);
        }
      }
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const newPhi = phi + event.deltaY * 0.001;
      phi = Math.min(Math.PI - 0.2, Math.max(0.2, newPhi));
      updateCamera();
    }

    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // Resize
    function onResize() {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);

    // Animate (gentle node bobbing for life)
    let frame = 0;
    let raf = 0;
    function tick() {
      frame += 1;
      for (let i = 0; i < nodeMeshes.length; i += 1) {
        const m = nodeMeshes[i];
        m.position.y += Math.sin(frame * 0.01 + i) * 0.04;
      }
      // Selected node halo: scale pulse
      for (const mesh of nodeMeshes) {
        const scale = mesh.userData.slug === selectedRef.current?.slug ? 1.4 : 1.0;
        mesh.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.12);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('wheel', onWheel);
      mount.removeChild(canvas);
      renderer.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const mat = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
    };
  }, []);

  return (
    <main
      data-testid="geopolitics-space"
      style={{
        minHeight: 'calc(100svh - 120px)',
        background: 'radial-gradient(circle at 50% 50%, rgba(30,20,12,1), rgba(10,6,3,1))',
        width: 'calc(100% + 48px)',
        marginInline: '-24px',
        padding: 'clamp(10px, 2vw, 18px) clamp(12px, 4vw, 28px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <EducationModeSwitch active="world" onSwitchToSelf={onSwitchToSelf} />

      <header style={{ margin: '6px 0 8px', position: 'relative', zIndex: 2 }}>
        <p style={{ ...smallLabel, color: 'rgba(196,160,96,0.7)' }}>education / world · space</p>
        <h1
          style={{
            margin: '4px 0 4px',
            color: '#ffe6aa',
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(24px, 4vw, 36px)',
            letterSpacing: '0.01em',
          }}
        >
          The walk so far, in space
        </h1>
        <p
          style={{
            margin: 0,
            color: 'rgba(240,216,152,0.72)',
            fontFamily: 'var(--font-serif)',
            fontSize: 13,
            lineHeight: 1.5,
            maxWidth: 640,
          }}
        >
          Drag to orbit · scroll to tilt · tap a sphere to select · tap again to open the page. Each
          tier sits at its own depth: Now near, Decade middle, Horizon far.
        </p>
      </header>

      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: 'clamp(440px, 64svh, 720px)',
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid rgba(180,108,52,0.32)',
          background: '#0a0603',
          touchAction: 'none',
          position: 'relative',
        }}
      />

      {(hovered || selected) && (
        <div
          data-testid="space-readout"
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            bottom: 14,
            zIndex: 8,
            margin: '0 auto',
            maxWidth: 640,
            border: '1px solid rgba(180,108,52,0.55)',
            background: 'rgba(20,12,6,0.92)',
            borderRadius: 12,
            padding: '10px 14px',
            display: 'grid',
            gap: 4,
            fontFamily: 'var(--font-serif)',
            color: 'rgba(240,216,152,0.94)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {(() => {
            const target = selected ?? hovered;
            if (!target) return null;
            return (
              <>
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(196,160,96,0.78)',
                  }}
                >
                  {target.categoryTitle} · {target.programTitle} · Ch{' '}
                  {target.chapterTitle.toLowerCase()}
                </span>
                <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.25 }}>
                  {target.title}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(196,160,96,0.62)' }}>
                  in {target.incoming} · out {target.outgoing}
                  {selected?.slug === target.slug && ' · tap the sphere again to read'}
                </span>
              </>
            );
          })()}
        </div>
      )}
    </main>
  );
}

function layoutNodes(graph: Graph) {
  const positions = new Map<string, { x: number; y: number; z: number }>();
  // Group nodes by tier × category. Distribute angularly within tier; vertical jitter within category.
  const byTierCategory = new Map<string, GraphNode[]>();
  for (const node of graph.nodes) {
    const located = locatePage(node.slug);
    const tier = located?.category.tier ?? 'decade';
    const cat = located?.category.slug ?? 'unknown';
    const key = `${tier}::${cat}`;
    if (!byTierCategory.has(key)) byTierCategory.set(key, []);
    byTierCategory.get(key)!.push(node);
  }

  // Determine angular slots per tier: spread categories evenly.
  const categoriesPerTier = new Map<string, string[]>();
  for (const cat of GEOPOLITICS_CATEGORIES) {
    if (!categoriesPerTier.has(cat.tier)) categoriesPerTier.set(cat.tier, []);
    categoriesPerTier.get(cat.tier)!.push(cat.slug);
  }

  for (const [tier, cats] of categoriesPerTier) {
    const z = TIER_Z[tier] ?? 0;
    cats.forEach((catSlug, catIndex) => {
      const angle = (catIndex / Math.max(1, cats.length)) * Math.PI * 2;
      const radius = 170;
      const cx = Math.cos(angle) * radius;
      const cy = Math.sin(angle) * radius * 0.6;
      const nodes = byTierCategory.get(`${tier}::${catSlug}`) ?? [];
      const ringRadius = 28 + nodes.length * 6;
      nodes.forEach((node, i) => {
        const t = nodes.length === 1 ? 0 : (i / (nodes.length - 1)) * Math.PI * 2;
        positions.set(node.slug, {
          x: cx + Math.cos(t) * ringRadius,
          y: cy + Math.sin(t) * ringRadius * 0.6 + (i % 2 === 0 ? 12 : -12),
          z: z + (i - nodes.length / 2) * 4,
        });
      });
    });
  }
  return positions;
}

function makeLabelSprite(text: string, color: number, opacity: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Object3D();
  ctx.fillStyle = `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${opacity})`;
  ctx.font = 'bold 56px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  return new THREE.Sprite(material);
}

const smallLabel = {
  margin: 0,
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
};
