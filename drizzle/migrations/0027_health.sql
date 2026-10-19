-- Health: the /health page (knee, shoulder and feet, day by day).
--
-- health_log holds one value per user, day and key: a tick on an exercise
-- (`am|lift-sky` = '1'), a pain number (`pain|knee` = '0'..'10') or the day's
-- note (`feel`). Unticking deletes the row.
--
-- health_notes is shaped like coding_notes: any number of questions, comments
-- and things to research per place, with an answer written from the terminal
-- beside a note, never over it.
--
-- Safe to run twice: everything is "if not exists".

create table if not exists public.health_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  item_key text not null,
  value text not null,
  updated_at timestamptz not null default now(),

  primary key (user_id, day, item_key),
  constraint health_log_item_key_length check (char_length(item_key) between 1 and 100),
  constraint health_log_value_length check (char_length(value) between 1 and 2000)
);

create table if not exists public.health_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null,
  kind text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  answer text,
  answered_at timestamptz,
  read_at timestamptz,

  constraint health_notes_kind_known check (kind in ('question', 'comment', 'research')),
  constraint health_notes_item_key_length check (char_length(item_key) between 1 and 200),
  constraint health_notes_body_length check (char_length(body) between 1 and 2000),
  constraint health_notes_answer_length check (answer is null or char_length(answer) between 1 and 8000)
);

create index if not exists health_notes_user_item_idx
  on public.health_notes (user_id, item_key, created_at);

alter table public.health_log enable row level security;
alter table public.health_notes enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['health_log', 'health_notes'] loop
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
