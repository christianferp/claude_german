-- Words tapped in a podcast transcript ("My words"), so the collection
-- follows the user across devices. Optional: the feature works fully from
-- local storage without this column — sync just unions both sides.
--
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.

alter table public.user_state
  add column if not exists vocab jsonb;
