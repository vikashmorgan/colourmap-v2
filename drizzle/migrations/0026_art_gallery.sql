-- ─── Art ideas gallery, private to each user ───────────────────────────────
--
-- The Art ideas notebook groups ideas under themes, and each idea has a
-- gallery of pictures: sketches, references, photos of work in progress.
-- The pictures are personal, so they live in a private bucket, under a folder
-- named after the user, one sub-folder per idea, and are read through
-- short-lived signed URLs.
--
-- Path convention: {userId}/{ideaId}/{timestamp}-{name}.{jpg|png|webp|gif}
-- Therefore storage.foldername(name)[1] must equal auth.uid()::text.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('art-gallery', 'art-gallery', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'art_gallery_select_own'
  ) then
    create policy art_gallery_select_own on storage.objects
      for select to authenticated
      using (bucket_id = 'art-gallery' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'art_gallery_insert_own'
  ) then
    create policy art_gallery_insert_own on storage.objects
      for insert to authenticated
      with check (bucket_id = 'art-gallery' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  -- Removing a picture from an idea's gallery.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'art_gallery_delete_own'
  ) then
    create policy art_gallery_delete_own on storage.objects
      for delete to authenticated
      using (bucket_id = 'art-gallery' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;
