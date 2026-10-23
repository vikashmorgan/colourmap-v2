-- The prompt queue: things to be built, kept apart from missions.
--
-- Missions are what Victor does. Prompts are what gets built. Holding both in
-- one list made the mission list two-thirds irrelevant to the person reading
-- it, and a list you scroll past is a list you stop reading.
--
-- A separate table rather than a flag on missions, because the lifecycles
-- genuinely differ: a mission is done when a person did it; a prompt is done
-- when code shipped, and it carries the pull request that answered it.
--
-- Notes deliberately do NOT get a table here. They go to notebook_entries,
-- which already exists and already has a page. Two notebooks would be exactly
-- the confusion this is meant to avoid.

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  -- queued  nobody has started it
  -- taken   a session is working on it
  -- done    shipped; pr_url usually says where
  -- parked  deliberately not now. Kept rather than deleted, because why it was
  --         parked is worth more than the space deleting it would give back.
  status text not null default 'queued',
  pr_url text,
  note text,
  created_at timestamptz not null default now(),
  done_at timestamptz,

  constraint prompts_status_known
    check (status in ('queued', 'taken', 'done', 'parked')),
  constraint prompts_body_not_empty
    check (length(btrim(body)) > 0),
  -- A prompt that is done must say when. Without this the queue can hold rows
  -- that are finished and undatable, which makes "what shipped this week"
  -- unanswerable a month later.
  constraint prompts_done_has_date
    check (status <> 'done' or done_at is not null)
);

-- Two indexes because these are two different questions: the open queue is
-- small and read oldest-first; the history grows and is read newest-first.
create index if not exists prompts_user_created_idx
  on public.prompts (user_id, created_at desc);

create index if not exists prompts_open_idx
  on public.prompts (user_id, created_at)
  where status in ('queued', 'taken');

alter table public.prompts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'prompts_select_own') then
    create policy prompts_select_own on public.prompts
      for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'prompts_insert_own') then
    create policy prompts_insert_own on public.prompts
      for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'prompts_update_own') then
    create policy prompts_update_own on public.prompts
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'prompts_delete_own') then
    create policy prompts_delete_own on public.prompts
      for delete using (auth.uid() = user_id);
  end if;
end $$;
