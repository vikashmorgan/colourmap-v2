'use client';

import { useMemo, useState } from 'react';
import { buildGraph, type Graph, type GraphEdge, type GraphNode } from '@/lib/geopolitics-graph';
import EducationModeSwitch from './EducationModeSwitch';

const EDGE_COLOR: Record<GraphEdge['kind'], string> = {
  dependsOn: 'rgba(122,84,56,0.55)',
  feedsInto: 'rgba(180,108,52,0.55)',
  related: 'rgba(36,52,82,0.2)',
};

type Props = {
  onSwitchToSelf?: () => void;
  onOpenPage?: (slug: string) => void;
};

export default function GeopoliticsGraph({ onSwitchToSelf, onOpenPage }: Props) {
  const graph = useMemo(() => buildGraph(), []);
  const [highlightSlug, setHighlightSlug] = useState<string | null>(null);
  const highlightedEdges = useMemo(() => {
    if (!highlightSlug) return new Set<string>();
    return new Set(
      graph.edges
        .filter((edge) => edge.from === highlightSlug || edge.to === highlightSlug)
        .map(edgeKey),
    );
  }, [graph.edges, highlightSlug]);

  return (
    <main
      data-testid="geopolitics-graph"
      style={{
        minHeight: 'calc(100svh - 120px)',
        background:
          'linear-gradient(180deg, rgba(236,220,188,0.74), rgba(206,184,145,0.34)), radial-gradient(circle at 80% 8%, rgba(122,84,56,0.16), transparent 38%)',
        width: 'calc(100% + 48px)',
        marginInline: '-24px',
        padding: 'clamp(10px, 2vw, 22px) clamp(12px, 4vw, 28px)',
      }}
    >
      <EducationModeSwitch active="world" onSwitchToSelf={onSwitchToSelf} />

      <header style={{ margin: '6px 0 12px' }}>
        <p style={smallLabel}>education / world · knowledge graph</p>
        <h1
          style={{
            margin: '4px 0 4px',
            color: '#2a1d0e',
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(26px, 4.4vw, 40px)',
            letterSpacing: '0.01em',
          }}
        >
          The walk so far
        </h1>
        <p
          style={{
            margin: 0,
            color: 'rgba(40,32,22,0.74)',
            fontFamily: 'var(--font-serif)',
            fontSize: 14,
            lineHeight: 1.5,
            maxWidth: 640,
          }}
        >
          {graph.nodes.length} pages, {graph.edges.length} edges. Columns are chapters; arrows show
          which page <strong>builds on</strong> which. Tap a node to highlight its dependencies; tap
          again to open it.
        </p>
        <Legend />
      </header>

      <div
        style={{
          border: '1px solid rgba(122,84,56,0.26)',
          background: 'rgba(255,248,231,0.78)',
          borderRadius: 14,
          overflowX: 'auto',
          padding: 6,
        }}
      >
        <svg
          width={graph.width}
          height={graph.height}
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          style={{ display: 'block', maxWidth: '100%' }}
          role="img"
          aria-label="Knowledge graph of authored pages"
        >
          <defs>
            <marker
              id="arrow-depends"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(82,58,38,0.72)" />
            </marker>
            <marker
              id="arrow-feeds"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(180,108,52,0.7)" />
            </marker>
          </defs>

          {graph.edges.map((edge) => {
            const from = graph.nodes.find((n) => n.slug === edge.from);
            const to = graph.nodes.find((n) => n.slug === edge.to);
            if (!from || !to) return null;
            const key = edgeKey(edge);
            const highlighted = highlightedEdges.has(key);
            const path = curvedPath(from, to);
            return (
              <path
                key={key}
                d={path}
                stroke={EDGE_COLOR[edge.kind]}
                strokeWidth={highlighted ? 2.5 : 1.2}
                strokeOpacity={highlighted ? 1 : highlightSlug ? 0.18 : 0.7}
                fill="none"
                markerEnd={
                  edge.kind === 'dependsOn'
                    ? 'url(#arrow-depends)'
                    : edge.kind === 'feedsInto'
                      ? 'url(#arrow-feeds)'
                      : undefined
                }
              />
            );
          })}

          {graph.nodes.map((node) => (
            <GraphNodeView
              key={node.slug}
              node={node}
              highlighted={highlightSlug === node.slug}
              dimmed={
                !!highlightSlug &&
                highlightSlug !== node.slug &&
                !isNeighbour(graph, highlightSlug, node.slug)
              }
              onTap={() => {
                if (highlightSlug === node.slug) {
                  onOpenPage?.(node.slug);
                  return;
                }
                setHighlightSlug(node.slug);
              }}
            />
          ))}
        </svg>
      </div>
    </main>
  );
}

function GraphNodeView({
  node,
  highlighted,
  dimmed,
  onTap,
}: {
  node: GraphNode;
  highlighted: boolean;
  dimmed: boolean;
  onTap: () => void;
}) {
  const size = 14 + Math.min(8, node.incoming + node.outgoing);
  return (
    <g
      data-testid={`graph-node-${node.slug}`}
      style={{ cursor: 'pointer', opacity: dimmed ? 0.3 : 1 }}
      onClick={onTap}
    >
      <circle
        cx={node.x}
        cy={node.y}
        r={size}
        fill={highlighted ? '#1f2a3d' : 'rgba(255,248,231,0.92)'}
        stroke={highlighted ? '#1f2a3d' : 'rgba(122,84,56,0.62)'}
        strokeWidth={highlighted ? 2.5 : 1.2}
      />
      <text
        x={node.x}
        y={node.y + size + 14}
        textAnchor="middle"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 11,
          fontWeight: highlighted ? 800 : 600,
          fill: highlighted ? '#1f2a3d' : 'rgba(34,28,20,0.86)',
        }}
      >
        {truncate(node.title, 28)}
      </text>
      <title>
        {node.title} — {node.chapterTitle} · in {node.incoming} / out {node.outgoing}
      </title>
    </g>
  );
}

function Legend() {
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: 8,
      }}
    >
      <LegendDot color="rgba(122,84,56,0.55)" label="depends-on" />
      <LegendDot color="rgba(180,108,52,0.55)" label="feeds-into" />
      <LegendDot color="rgba(36,52,82,0.2)" label="related" />
      <span style={{ ...smallLabel, color: 'rgba(36,52,82,0.46)' }}>
        node size = total in + out degree
      </span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-serif)',
        fontSize: 11,
        color: 'rgba(34,28,20,0.76)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 22, height: 2, borderRadius: 99, background: color }}
      />
      {label}
    </span>
  );
}

function curvedPath(a: GraphNode, b: GraphNode) {
  const midX = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
}

function isNeighbour(graph: Graph, anchor: string, candidate: string) {
  return graph.edges.some(
    (edge) =>
      (edge.from === anchor && edge.to === candidate) ||
      (edge.to === anchor && edge.from === candidate),
  );
}

function edgeKey(edge: GraphEdge) {
  return `${edge.kind}:${edge.from}->${edge.to}`;
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

const smallLabel = {
  margin: 0,
  color: 'rgba(82,58,38,0.66)',
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
};
