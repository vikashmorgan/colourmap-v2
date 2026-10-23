import PullRequests from '@/components/PullRequests';

/*
 * THE LAST STEP OF THE LOOP, GIVEN A HOME.
 *
 * The app records, the agent works, and then somebody has to look. Until this
 * page that somebody had to be at a laptop — the exact dependency everything
 * else here was built to remove.
 *
 * Called the shipyard rather than "pull requests" because what it holds is
 * work waiting to go out, and the reader is the person who decides whether it
 * does. Naming it after the GitHub noun would describe the plumbing instead.
 */
export const metadata = { title: 'Shipyard' };

/* Always fresh. A cached check state is the one thing that would make this
 * less safe than the GitHub app rather than more. */
export const dynamic = 'force-dynamic';

export default function ShipyardPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-8" style={{ display: 'grid', gap: 18 }}>
      <header>
        <p
          style={{
            margin: '0 0 6px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--muted-foreground)',
          }}
        >
          Shipyard
        </p>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 28, lineHeight: 1.2 }}>
          What is waiting to go out
        </h1>
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 14,
            lineHeight: 1.55,
            color: 'var(--muted-foreground)',
          }}
        >
          A merge is offered only when the checks have finished and passed, and never on a change
          that touches a protected path. GitHub cannot enforce that on a private repository on this
          plan, so it is enforced here.
        </p>
      </header>

      <PullRequests />
    </div>
  );
}
