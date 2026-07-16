-- Phrase illustrations: one shared cartoon per phrase, generated once by
-- whichever user first views the phrase (with a Gemini key), then reused by
-- everyone. Public read; only signed-in users may add images, and existing
-- images can't be overwritten from the client.
--
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.

insert into storage.buckets (id, name, public)
values ('phrase-images', 'phrase-images', true)
on conflict (id) do nothing;

create policy "Anyone can view phrase images"
  on storage.objects for select
  using (bucket_id = 'phrase-images');

create policy "Signed-in users can add phrase images"
  on storage.objects for insert
  with check (bucket_id = 'phrase-images' and auth.role() = 'authenticated');
