-- Voice notes: the audio is the record, the transcript is a derivative.
--
-- Capture must not be able to fail. A row exists as soon as audio is stored,
-- before anything has tried to read it, so a failed or absent transcription
-- costs a reading rather than the thought itself.

create table if not exists public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  duration_secs integer,
  status text not null default 'captured',
  transcript text,
  lang text,
  branch text,
  error text,
  created_at timestamptz not null default now(),
  transcribed_at timestamptz,

  -- The status vocabulary is enforced here rather than trusted from a route.
  -- Four values, and a row that is 'transcribed' must actually carry text —
  -- the state and the data cannot drift apart.
  constraint voice_notes_status_known
    check (status in ('captured', 'transcribing', 'transcribed', 'failed')),
  constraint voice_notes_transcribed_has_text
    check (status <> 'transcribed' or transcript is not null)
);

create index if not exists voice_notes_user_created_idx
  on public.voice_notes (user_id, created_at desc);

-- Unread notes are the queue the app and the terminal both work from, and
-- they are always a small slice of the table.
create index if not exists voice_notes_pending_idx
  on public.voice_notes (user_id, created_at)
  where status in ('captured', 'transcribing');

alter table public.voice_notes enable row level security;

create policy voice_notes_select_own on public.voice_notes
  for select using (auth.uid() = user_id);

create policy voice_notes_insert_own on public.voice_notes
  for insert with check (auth.uid() = user_id);

create policy voice_notes_update_own on public.voice_notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Deleting a voice note must also delete its audio, and that cannot be done
-- from SQL. The app removes the object first and the row second, so a delete
-- policy exists; what it must never become is a bulk delete.
create policy voice_notes_delete_own on public.voice_notes
  for delete using (auth.uid() = user_id);
