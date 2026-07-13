-- Daily Phrase backend schema.
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.

-- ── Mastered phrases ────────────────────────────────────────────────────────
create table if not exists public.mastered (
  user_id uuid not null references auth.users (id) on delete cascade,
  phrase_id text not null,
  mastered_at timestamptz not null default now(),
  recording_mime text not null default '',
  has_audio boolean not null default false,
  primary key (user_id, phrase_id)
);

alter table public.mastered enable row level security;

create policy "Users manage their own mastered rows"
  on public.mastered for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Per-user app state (language/level follows you across devices) ─────────
create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  language text,
  levels jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

create policy "Users manage their own state"
  on public.user_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Recordings bucket (private; one file per user per phrase) ──────────────
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

create policy "Users read their own recordings"
  on storage.objects for select
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users upload their own recordings"
  on storage.objects for insert
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update their own recordings"
  on storage.objects for update
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete their own recordings"
  on storage.objects for delete
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
