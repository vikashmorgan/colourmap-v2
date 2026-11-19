'use client';

/**
 * The porthole (docs/specs/the-grid.md): asked 2026-11-19, "a cool connection to the grid tree,
 * with the videogames appearing in autopilot in a small porthole that opens when you check the
 * racing part of the game". A round window with a brass-gold rim and rivets, opening when the map
 * is on the racing part; inside, Drive plays itself (/drive-window). Tap it to drive.
 */

export const PORTHOLE_SRC = '/drive-window';

/** Whether the map is on the racing part: the Play hub, or the tree's Worlds or Play limb. */
export function onRacing(placeKey: string, hubId: string | null): boolean {
  if (hubId === 'play') return true;
  return /\|(worlds|play)$/.test(placeKey);
}

const RIVETS = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2);

export function Porthole({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Drive, on autopilot: open Drive"
      title="Drive · autopilot · tap to drive"
      className="porthole"
      style={{
        position: 'absolute',
        right: 24,
        bottom: 70,
        width: 196,
        height: 196,
        padding: 0,
        border: 0,
        borderRadius: '50%',
        background: 'none',
        cursor: 'pointer',
        zIndex: 3,
      }}
    >
      <style>{`
        @keyframes porthole-open { from { transform: scale(0.2) rotate(-40deg); opacity: 0; } to { transform: none; opacity: 1; } }
        .porthole { animation: porthole-open .55s cubic-bezier(.2,.9,.3,1.2) both; }
        .porthole:hover .porthole-rim, .porthole:focus-visible .porthole-rim { box-shadow: 0 0 0 2px #f1dfb4, 0 0 26px rgba(232,186,96,.55), inset 0 0 14px rgba(0,0,0,.7); }
        @media (prefers-reduced-motion: reduce) { .porthole { animation: none; } }
      `}</style>
      <span
        style={{
          position: 'absolute',
          inset: 10,
          borderRadius: '50%',
          overflow: 'hidden',
          background: '#08060a',
        }}
      >
        <iframe
          src={PORTHOLE_SRC}
          title="Drive on autopilot"
          tabIndex={-1}
          style={{ width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
        />
        {/* The glass: a sheen across the top. */}
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 32% 22%, rgba(255,255,255,0.28), rgba(255,255,255,0) 38%), radial-gradient(circle, rgba(0,0,0,0) 62%, rgba(0,0,0,0.55) 100%)',
            pointerEvents: 'none',
          }}
        />
      </span>
      {/* The rim, and its rivets. */}
      <span
        className="porthole-rim"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '10px solid transparent',
          background:
            'conic-gradient(from 210deg, #7a5422, #e8c27a, #a77a36, #f4dca0, #8a5f28, #e0b866, #7a5422) border-box',
          WebkitMask: 'radial-gradient(circle, transparent 87px, #000 88px)',
          mask: 'radial-gradient(circle, transparent 87px, #000 88px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.55), inset 0 0 14px rgba(0,0,0,0.7)',
        }}
      />
      {RIVETS.map((a) => (
        <span
          key={a}
          style={{
            position: 'absolute',
            left: 98 + Math.cos(a) * 93 - 2.5,
            top: 98 + Math.sin(a) * 93 - 2.5,
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #fff3cf, #8a5f28)',
          }}
        />
      ))}
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -22,
          textAlign: 'center',
          font: '600 9px ui-monospace, Consolas, monospace',
          letterSpacing: '0.24em',
          color: '#C4A060',
        }}
      >
        AUTOPILOT · TAP TO DRIVE
      </span>
    </button>
  );
}
