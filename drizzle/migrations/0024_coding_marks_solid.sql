-- A fourth mark on the coding page: "solid", for a box the user really owns,
-- above "got" (understood). Widens the allowed values; existing rows are
-- untouched.

alter table public.coding_marks drop constraint if exists coding_marks_mark_known;
alter table public.coding_marks
  add constraint coding_marks_mark_known check (mark is null or mark in ('solid', 'got', 'mid', 'late'));
