-- Spaced-repetition state for the "Do you still remember?" challenge, so the
-- schedule follows the user across devices. Optional: the feature works fully
-- from local storage without these columns.
--
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.

alter table public.mastered
  add column if not exists recall_streak integer not null default 0,
  add column if not exists last_recall_at timestamptz,
  add column if not exists next_due_at timestamptz;
