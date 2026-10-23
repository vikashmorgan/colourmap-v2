-- Coding marks: what the user has recorded about each box of the /coding
-- study page. A mark says how well they know it: understood ("got"), confused
-- ("mid") or no time yet ("late"). A note is their own question or
-- comment about it.
--
-- One row per box with a mark, a note, or both. A box with neither has no
-- row: clearing both deletes it, so the table only holds what was recorded.

create table if not exists public.coding_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null,
  mark text,
  note text,
  note_kind text,
  updated_at timestamptz not null default now(),

  -- One row per box per user: what makes saving a box a single upsert.
  constraint coding_marks_user_item_unique unique (user_id, item_key),
  constraint coding_marks_mark_known check (mark is null or mark in ('got', 'mid', 'late')),
  constraint coding_marks_item_key_length check (char_length(item_key) between 1 and 200),
  constraint coding_marks_note_length check (note is null or char_length(note) between 1 and 2000),
  constraint coding_marks_note_kind_known check (note_kind is null or note_kind in ('question', 'comment')),
  -- A note always says what it is, and a kind never exists without a note.
  constraint coding_marks_note_has_kind check ((note is null) = (note_kind is null)),
  constraint coding_marks_not_empty check (mark is not null or note is not null)
);

alter table public.coding_marks enable row level security;

-- Postgres has no CREATE POLICY IF NOT EXISTS; the guard lets a half-applied
-- migration be re-run.
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'coding_marks_select_own') then
    create policy coding_marks_select_own on public.coding_marks
      for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'coding_marks_insert_own') then
    create policy coding_marks_insert_own on public.coding_marks
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'coding_marks_update_own') then
    create policy coding_marks_update_own on public.coding_marks
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'coding_marks_delete_own') then
    create policy coding_marks_delete_own on public.coding_marks
      for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─── Course slides, private to each user ──────────────────────────────────
--
-- The /coding page links each box to the slide it came from. The slides are
-- a teacher's material and this repository is public, so they never live in
-- the repo: each user uploads their own copies into a private bucket, under
-- a folder named after their user id, and reads them through short-lived
-- signed URLs.
--
-- Path convention: {userId}/{SessionN.pdf}
-- Therefore storage.foldername(name)[1] must equal auth.uid()::text.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coding-slides', 'coding-slides', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'coding_slides_select_own'
  ) then
    create policy coding_slides_select_own on storage.objects
      for select to authenticated
      using (bucket_id = 'coding-slides' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'coding_slides_insert_own'
  ) then
    create policy coding_slides_insert_own on storage.objects
      for insert to authenticated
      with check (bucket_id = 'coding-slides' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  -- Re-uploading a session replaces the file, which is an update.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'coding_slides_update_own'
  ) then
    create policy coding_slides_update_own on storage.objects
      for update to authenticated
      using (bucket_id = 'coding-slides' and (storage.foldername(name))[1] = auth.uid()::text)
      with check (bucket_id = 'coding-slides' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;
