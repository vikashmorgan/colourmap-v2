'use client';

type Props = {
  onOpenIntel?: () => void;
  onOpenWorld?: () => void;
};

export default function CmaCgmProposal({ onOpenIntel, onOpenWorld }: Props) {
  return (
    <main
      data-testid="cma-cgm-proposal"
      style={{
        minHeight: '100svh',
        background:
          'linear-gradient(180deg, rgba(236,220,188,0.74), rgba(206,184,145,0.34)), radial-gradient(circle at 78% 14%, rgba(122,84,56,0.22), transparent 38%)',
        width: 'calc(100% + 48px)',
        marginInline: '-24px',
        padding: 'clamp(18px, 4vw, 56px) clamp(14px, 6vw, 64px) 80px',
      }}
    >
      <div
        style={{
          maxWidth: 920,
          marginInline: 'auto',
          display: 'grid',
          gap: 'clamp(28px, 4vw, 56px)',
        }}
      >
        <Header />
        <Premise />
        <IntelBriefMock onOpenIntel={onOpenIntel} onOpenWorld={onOpenWorld} />
        <SeafarerNoteTeaser />
        <ThreeNumbers />
        <SixWeekPilot />
        <AboutMe />
      </div>
    </main>
  );
}

function Header() {
  return (
    <header
      style={{
        display: 'grid',
        gap: 8,
        borderBottom: '1px solid rgba(36,52,82,0.2)',
        paddingBottom: 18,
      }}
    >
      <p style={smallLabel}>proposal · for cma cgm group · marseille</p>
      <h1
        style={{
          margin: 0,
          color: '#1f1408',
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(32px, 6vw, 56px)',
          letterSpacing: '0.005em',
          lineHeight: 1.05,
        }}
      >
        Geopolitics Intel & Crew Practice — two MAIA-aligned modules for CMA CGM
      </h1>
      <p
        style={{
          margin: '4px 0 0',
          color: 'rgba(40,32,22,0.74)',
          fontFamily: 'var(--font-serif)',
          fontSize: 16,
          lineHeight: 1.55,
          maxWidth: 720,
        }}
      >
        A six-week pilot proposing two complementary verticals on top of the Group&apos;s existing
        AI stack. Prepared 2026-06-09 for Jean Fauquembergue, Agnès Mossina, and the Tangram
        innovation team.
      </p>
    </header>
  );
}

function Premise() {
  return (
    <section style={section}>
      <p style={smallLabel}>premise</p>
      <h2 style={h2Style}>Two transitions, one French stack.</h2>
      <p style={bodyStyle}>
        The 2026 Hormuz crisis repriced war-risk premiums roughly 12× — from a 0.18% baseline to
        2-3% of hull value through March — and pushed Brent to $119/bbl on 19 March before the IEA
        released a record 400-million-barrel emergency stockpile. The Red Sea container reroute
        around the Cape persists. Container carriers do not transit Hormuz heavily, but the indirect
        channels — bunker fuel, reinsurance pass-through, customer-side oil shocks — land hard on a
        #3 carrier with a 45.5% orderbook.
      </p>
      <p style={bodyStyle}>
        CMA CGM&apos;s response since 2023 has been deliberate: <strong>€500 m to AI</strong>,
        co-founding Kyutai with Iliad and Schmidt Futures, a five-year €100 m Mistral partnership
        with ~20 Mistral engineers embedded in Marseille, and the MAIA agentic platform now rolling
        out to ~80,000 employees from 1 June 2026.
      </p>
      <Quote
        attribution="Rodolphe Saadé, Kyutai launch, November 2023"
        lines={[
          '"place France and the rest of Europe at the forefront of artificial intelligence research"',
          '"I would like the younger generation to benefit from all the opportunities that this technology has to offer"',
        ]}
      />
      <p style={bodyStyle}>
        This proposal answers that ask directly. It places two verticals on top of MAIA: a
        geopolitics intelligence agent calibrated to the Group&apos;s actual exposure, and an
        offline-capable seafarer wellbeing module built from a French wellness engine I have been
        shipping for two years.
      </p>
    </section>
  );
}

function IntelBriefMock({
  onOpenIntel,
  onOpenWorld,
}: {
  onOpenIntel?: () => void;
  onOpenWorld?: () => void;
}) {
  return (
    <section style={section}>
      <p style={smallLabel}>artifact 1</p>
      <h2 style={h2Style}>Geopolitics Intel — a daily brief and dashboard, CMA-CGM-skinned.</h2>
      <p style={bodyStyle}>
        Every morning, a 5-7 card brief that opens in MAIA. Every chokepoint, war-risk move, and
        freight-rate delta linked back to a short education page that explains the relationship —
        not just the number. The dashboard is the at-a-glance view; the brief is the time-pressure
        view.
      </p>
      <div
        style={{
          border: '1px solid rgba(122,84,56,0.26)',
          background: 'rgba(255,248,231,0.84)',
          borderRadius: 14,
          padding: '14px 18px',
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ display: 'grid', gap: 4 }}>
          <span style={chip('rgba(82,58,38,0.85)', '#ffe6aa')}>TOP MOVEMENT · today</span>
          <p style={{ ...bodyStyle, margin: 0 }}>
            <strong>Hormuz VLCC war-risk eased to ~1.1% from a 2.5% March peak.</strong> 12× the
            pre-war 0.18% baseline. Translation: a $1.6 M premium per transit on an $80 M-insured
            hull.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Card label="Red Sea" value="DEGRADED" tone="warn" />
          <Card label="CMA CGM fleet" value="4.140 M TEU" tone="anchor" />
          <Card label="Δ7d war-risk" value="↓ 28 bps" tone="good" />
          <Card label="MAIA users" value="~80,000" tone="anchor" />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {onOpenIntel && (
            <button type="button" onClick={onOpenIntel} style={primaryButton}>
              Open the live dashboard →
            </button>
          )}
          {onOpenWorld && (
            <button type="button" onClick={onOpenWorld} style={secondaryButton}>
              Read the Hormuz briefing
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function SeafarerNoteTeaser() {
  return (
    <section style={section}>
      <p style={smallLabel}>artifact 2</p>
      <h2 style={h2Style}>SeafarerNote — onboard crew practice that runs offline.</h2>
      <p style={bodyStyle}>
        Built on top of an existing wellness engine I have been shipping for two years. Daily
        comic-style prompts, voice-able mood log, two 6-week programs (first weeks aboard, last
        weeks before return), seven languages day one. Captain dashboard surfaces aggregate-only
        sentiment with k≥5 anonymity gating. No individual entries ever escape the phone.
      </p>
      <div
        style={{
          border: '1px solid rgba(180,108,52,0.45)',
          background: 'rgba(255,243,217,0.86)',
          borderRadius: 14,
          padding: '14px 18px',
          display: 'grid',
          gap: 10,
        }}
      >
        <span style={chip('rgba(180,108,52,0.95)', '#ffe6aa')}>DAILY PRACTICE · DAY 5 ABOARD</span>
        <p style={{ ...bodyStyle, margin: 0, fontSize: 16 }}>
          &ldquo;Your first call home is the hardest. Before you make it, write down one thing you
          noticed about today that wasn&apos;t difficult.&rdquo;
        </p>
        <p style={{ ...bodyStyle, margin: 0, color: 'rgba(40,32,22,0.6)', fontSize: 13 }}>
          Voice or type. Stays on device. No HR ever sees it.
        </p>
      </div>
      <p style={bodyStyle}>
        This pairs with the &ldquo;She Sails&rdquo; programme launched by Christine Cabau Woehrel in
        December 2024. Same crew-wellbeing thesis, complementary delivery surface.
      </p>
    </section>
  );
}

function ThreeNumbers() {
  return (
    <section style={section}>
      <p style={smallLabel}>why this matters · three numbers</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        <NumberCard
          big="12×"
          label="war-risk repricing"
          note="Pre-war 0.18% → 2-3% of hull value at peak. Source: Howden Re, March 2026."
        />
        <NumberCard
          big="45.5%"
          label="CMA CGM orderbook / fleet"
          note="vs ~33.5% industry. Capex-led growth posture. Source: Alphaliner Jan 2026."
        />
        <NumberCard
          big="80k"
          label="MAIA users from 1 June 2026"
          note="Across CMA CGM, CEVA, CMA Media. 55+ projects, 200+ use cases. The docking surface."
        />
      </div>
    </section>
  );
}

function SixWeekPilot() {
  return (
    <section style={section}>
      <p style={smallLabel}>the 6-week pilot</p>
      <h2 style={h2Style}>Six weeks. Two artifacts. One decision.</h2>
      <ol style={{ display: 'grid', gap: 14, margin: 0, paddingInlineStart: 18 }}>
        <PilotPhase
          weeks="Weeks 1-2"
          title="Geopolitics Intel set-up"
          bullets={[
            "Entity watchlist scoped with the Group strategy team and Cabau Woehrel's operations office.",
            'Brief format approved by Fauquembergue and Mossina.',
            'Daily brief drafting loop running, with an editor on the CMA CGM side.',
          ]}
        />
        <PilotPhase
          weeks="Weeks 3-4"
          title="SeafarerNote pilot vessel"
          bullets={[
            'One vessel, ~22 crew, 4-week onboard deployment.',
            'Pre/post wellbeing baseline with k≥5 aggregation.',
            'Captain dashboard handed to the master.',
          ]}
        />
        <PilotPhase
          weeks="Weeks 5-6"
          title="Pitch back"
          bullets={[
            'Two reports: intel-brief readership analytics, SeafarerNote pre/post deltas.',
            'Cost projection for fleet-wide deployment and Intel B2B seats.',
            'Decision: renew, expand, or part as friends.',
          ]}
        />
      </ol>
      <p style={{ ...bodyStyle, marginTop: 6 }}>
        <strong>Indicative cost:</strong> €60k all-in (build + hosting + analyst time). Renewal
        optional and modular.
      </p>
    </section>
  );
}

function AboutMe() {
  return (
    <section style={section}>
      <p style={smallLabel}>about</p>
      <h2 style={h2Style}>About me</h2>
      <p style={bodyStyle}>
        Albert School master&apos;s student. Building two products: a wellness platform for
        emotional coherence (colourmap), and the Geopolitics Intel platform demoed here. Shipping
        every week. French stack — Mistral, Kyutai, French-controlled hosting. Reachable on the
        address below.
      </p>
      <p style={{ ...bodyStyle, color: 'rgba(40,32,22,0.6)' }}>
        This page itself is the artifact. The Intel dashboard above is live and clickable. The
        Hormuz briefing is real, cited, and adversarially verified. SeafarerNote runs on phone.
      </p>
    </section>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'warn' | 'good' | 'anchor';
}) {
  const border =
    tone === 'warn'
      ? 'rgba(215,122,82,0.55)'
      : tone === 'good'
        ? 'rgba(95,178,122,0.55)'
        : 'rgba(122,84,56,0.32)';
  return (
    <div
      style={{
        border: `1px solid ${border}`,
        background: 'rgba(255,248,231,0.7)',
        borderRadius: 10,
        padding: '8px 10px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 11,
          color: 'rgba(82,58,38,0.66)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 800, color: '#2a1d0e' }}
      >
        {value}
      </div>
    </div>
  );
}

function NumberCard({ big, label, note }: { big: string; label: string; note: string }) {
  return (
    <div
      style={{
        border: '1px solid rgba(122,84,56,0.26)',
        background: 'rgba(255,248,231,0.84)',
        borderRadius: 14,
        padding: '14px 18px',
        display: 'grid',
        gap: 6,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 44,
          fontWeight: 900,
          color: '#2a1d0e',
          lineHeight: 1,
        }}
      >
        {big}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 12,
          color: 'rgba(82,58,38,0.72)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 800,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 12,
          color: 'rgba(40,32,22,0.72)',
          lineHeight: 1.5,
        }}
      >
        {note}
      </div>
    </div>
  );
}

function PilotPhase({
  weeks,
  title,
  bullets,
}: {
  weeks: string;
  title: string;
  bullets: string[];
}) {
  return (
    <li style={{ listStyle: 'none' }}>
      <div style={{ display: 'grid', gap: 4, fontFamily: 'var(--font-serif)' }}>
        <span
          style={{
            fontSize: 11,
            color: 'rgba(82,58,38,0.66)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 800,
          }}
        >
          {weeks}
        </span>
        <h3 style={{ margin: 0, color: '#2a1d0e', fontSize: 18, lineHeight: 1.25 }}>{title}</h3>
        <ul
          style={{
            margin: '4px 0 0',
            paddingInlineStart: 18,
            color: 'rgba(40,32,22,0.86)',
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {bullets.map((b) => (
            <li key={b} style={{ marginBottom: 2 }}>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

function Quote({ attribution, lines }: { attribution: string; lines: string[] }) {
  return (
    <blockquote
      style={{
        margin: '6px 0',
        padding: '10px 14px',
        borderLeft: '3px solid rgba(180,108,52,0.7)',
        background: 'rgba(255,243,217,0.62)',
        borderRadius: '0 8px 8px 0',
        fontFamily: 'var(--font-serif)',
      }}
    >
      {lines.map((line) => (
        <p
          key={line}
          style={{
            margin: '2px 0',
            color: '#1f1408',
            fontSize: 15,
            lineHeight: 1.55,
            fontStyle: 'italic',
          }}
        >
          {line}
        </p>
      ))}
      <footer
        style={{
          marginTop: 6,
          color: 'rgba(40,32,22,0.66)',
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        — {attribution}
      </footer>
    </blockquote>
  );
}

function chip(bg: string, color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    width: 'fit-content',
    border: `1px solid ${bg}`,
    borderRadius: 999,
    background: bg,
    color,
    fontFamily: 'var(--font-serif)',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.12em',
    padding: '3px 9px',
    textTransform: 'uppercase' as const,
  };
}

const section: React.CSSProperties = {
  display: 'grid',
  gap: 10,
};

const smallLabel: React.CSSProperties = {
  margin: 0,
  color: 'rgba(82,58,38,0.66)',
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
};

const h2Style: React.CSSProperties = {
  margin: '2px 0 4px',
  color: '#1f1408',
  fontFamily: 'var(--font-serif)',
  fontSize: 'clamp(22px, 3.4vw, 30px)',
  lineHeight: 1.2,
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(34,28,20,0.86)',
  fontFamily: 'var(--font-serif)',
  fontSize: 15,
  lineHeight: 1.62,
};

const primaryButton: React.CSSProperties = {
  border: '1px solid rgba(122,84,56,0.42)',
  borderRadius: 999,
  background: 'rgba(82,58,38,0.92)',
  color: '#ffe6aa',
  cursor: 'pointer',
  fontFamily: 'var(--font-serif)',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.1em',
  padding: '9px 18px',
  textTransform: 'uppercase' as const,
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: 'rgba(255,248,231,0.7)',
  color: '#2a1d0e',
};
