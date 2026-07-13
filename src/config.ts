/**
 * Supabase project credentials. These are the *public* client credentials —
 * safe to commit: all data protection comes from row-level-security rules
 * (see supabase/migration.sql), never from hiding these values.
 *
 * Both empty → the app runs in local-only mode and hides the Account section.
 * Fill in from the Supabase dashboard: Settings → API.
 */
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

export const isBackendConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
