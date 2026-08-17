-- Daily practice streak (current/best/lastDate/freezes), so it follows the
-- user across devices. Optional: the feature works fully from local storage
-- without this column — sync just merges whichever device practiced more
-- recently.
--
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.

alter table public.user_state
  add column if not exists streak jsonb;
