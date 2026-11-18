export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Local dev mode: no Supabase credentials AND not a production build. */
export function isLocalDevMode(): boolean {
  return !isSupabaseConfigured() && process.env.NODE_ENV !== "production";
}
