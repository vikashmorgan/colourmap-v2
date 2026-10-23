-- Chill Machine public: feedback notes, saved mixes and saved recordings.
-- Spec: docs/specs/chill-machine-public.md.
--
-- chill_feedback takes notes from guests (user_id null, optional name) and
-- signed-in players. Inserts go through POST /api/chill/feedback with the
-- service role, so no insert policy is needed; only the owner reads them.
--
-- chill_mixes holds a whole Chill Machine setup as jsonb (layers, palette,
-- visuals, echo, beats, sections). chill_recordings points at audio files in
-- the private `recordings` bucket under {user_id}/chill/ (the folder-per-user
-- storage policies from 0017 keep each player inside their own folder).
--
-- Safe to run twice: everything is "if not exists".

create table if not exists public.chill_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text,
  message text not null,
  palette text,
  created_at timestamptz not null default now(),

  constraint chill_feedback_message_length check (char_length(message) between 1 and 2000),
  constraint chill_feedback_name_length check (name is null or char_length(name) between 1 and 80)
);

create table if not exists public.chill_mixes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  settings jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chill_mixes_title_length check (char_length(title) between 1 and 120)
);

create table if not exists public.chill_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  storage_path text not null,
  mime_type text not null,
  duration_secs integer,
  palette text,
  cues jsonb,
  created_at timestamptz not null default now(),

  constraint chill_recordings_title_length check (char_length(title) between 1 and 120)
);

create index if not exists chill_feedback_created_idx on public.chill_feedback (created_at desc);
create index if not exists chill_mixes_user_idx on public.chill_mixes (user_id, updated_at desc);
create index if not exists chill_recordings_user_idx on public.chill_recordings (user_id, created_at desc);

alter table public.chill_feedback enable row level security;
alter table public.chill_mixes enable row level security;
alter table public.chill_recordings enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['chill_mixes', 'chill_recordings'] loop
    if not exists (select 1 from pg_policies where policyname = t || '_select_own') then
      execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', t || '_select_own', t);
    end if;
    if not exists (select 1 from pg_policies where policyname = t || '_insert_own') then
      execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', t || '_insert_own', t);
    end if;
    if not exists (select 1 from pg_policies where policyname = t || '_update_own') then
      execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_update_own', t);
    end if;
    if not exists (select 1 from pg_policies where policyname = t || '_delete_own') then
      execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', t || '_delete_own', t);
    end if;
  end loop;
end $$;
