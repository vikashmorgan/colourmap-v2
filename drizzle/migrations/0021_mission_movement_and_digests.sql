-- Mission movement, and somewhere for the scheduled reader to write.
--
-- Two things, both in service of one goal: the app can show what is MOVING
-- rather than only what exists, and it can do so with the laptop closed.
--
-- WHY `branch` IS STORED WHEN lib/branches.ts SAYS BRANCHES ARE COMPUTED
--
-- That rule exists so nothing is filed by hand and changing your mind re-sorts
-- everything without a migration. It holds for routes, which have a path the
-- function can read.
--
-- A mission is a sentence typed on a phone. There is nothing to compute from,
-- and inferring "Corriger Sanitas" into Admin from its wording would be a
-- classifier pretending to be a rule. So the person states it once and the
-- column holds the statement. Null is allowed and means exactly what it says.
--
-- WHY `moved_at` IS NOT `updated_at`
--
-- `updated_at` moves when anything touches the row, including opening it.
-- `moved_at` moves only when something real happened, and the tree's honesty
-- depends on that difference — "actively growing" has to be a fact or the
-- figure is decoration.
--
-- Safe to re-run: every statement is guarded.

-- ─── Mission movement ──────────────────────────────────────────────────────

ALTER TABLE missions ADD COLUMN IF NOT EXISTS branch     text;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS due_on     date;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS moved_at   timestamptz;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS moved_note text;

-- The three branches of lib/branches.ts, and nothing else. Null stays legal.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'missions_branch_check'
  ) THEN
    ALTER TABLE missions
      ADD CONSTRAINT missions_branch_check
      CHECK (branch IS NULL OR branch IN ('art', 'admin', 'energy'));
  END IF;
END $$;

-- The two questions actually asked of this table: what is open and moving,
-- and what is due soon. Partial, because completed missions are not queried.
CREATE INDEX IF NOT EXISTS missions_open_moved_idx
  ON missions (user_id, moved_at DESC)
  WHERE completed = false;

CREATE INDEX IF NOT EXISTS missions_open_due_idx
  ON missions (user_id, due_on)
  WHERE completed = false AND due_on IS NOT NULL;

-- ─── Digests ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS digests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  kind       text NOT NULL DEFAULT 'weekly',
  body       text NOT NULL,
  source     text NOT NULL DEFAULT 'github-actions',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS digests_user_created_idx
  ON digests (user_id, created_at DESC);

-- ─── RLS, same pattern as 0016 ─────────────────────────────────────────────
--
-- A digest is derived from the most personal data in the system, so it gets
-- the same lock as the data it was derived from. Anything less would make the
-- summary a way around the protection on the source.

ALTER TABLE digests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'digests' AND policyname = 'digests_select_own'
  ) THEN
    CREATE POLICY digests_select_own ON digests
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'digests' AND policyname = 'digests_insert_own'
  ) THEN
    CREATE POLICY digests_insert_own ON digests
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'digests' AND policyname = 'digests_delete_own'
  ) THEN
    CREATE POLICY digests_delete_own ON digests
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- No UPDATE policy, on purpose. A digest is a record of what was observed at a
-- moment; editing one turns it into something that was never observed. Delete
-- it or write a new one.
