-- Coding notes: any number of questions and comments per box of the /coding
-- study page. Until now a box held one note, in coding_marks.note; this table
-- lets a box hold several, each edited or deleted on its own.
--
-- The answer columns are for replies written from the terminal ("answer my
-- coding questions"). They sit beside the note and never overwrite it: the
-- user's own words stay exactly as written.

create table if not exists public.coding_notes (
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

  constraint coding_notes_kind_known check (kind in ('question', 'comment')),
  constraint coding_notes_item_key_length check (char_length(item_key) between 1 and 200),
  constraint coding_notes_body_length check (char_length(body) between 1 and 2000),
  constraint coding_notes_answer_length check (answer is null or char_length(answer) between 1 and 8000)
);

create index if not exists coding_notes_user_item_idx
  on public.coding_notes (user_id, item_key, created_at);

alter table public.coding_notes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'coding_notes_select_own') then
    create policy coding_notes_select_own on public.coding_notes
      for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'coding_notes_insert_own') then
    create policy coding_notes_insert_own on public.coding_notes
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'coding_notes_update_own') then
    create policy coding_notes_update_own on public.coding_notes
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'coding_notes_delete_own') then
    create policy coding_notes_delete_own on public.coding_notes
      for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Bring the existing single notes across, once. Running this file again does
-- not copy them twice: a note is only copied when the same box has no note yet.
insert into public.coding_notes (user_id, item_key, kind, body, created_at, updated_at)
select m.user_id, m.item_key, m.note_kind, m.note, m.updated_at, m.updated_at
from public.coding_marks m
where m.note is not null
  and m.note_kind is not null
  and not exists (
    select 1 from public.coding_notes n
    where n.user_id = m.user_id and n.item_key = m.item_key
  );
