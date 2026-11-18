import { cookies } from "next/headers";
import { isLocalDevMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  mode: "supabase" | "local";
};

export const DEV_COOKIE = "dev_session";

export async function getCurrentUser(): Promise<AppUser | null> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u) return null;
    const email = u.email ?? "";
    return {
      id: u.id,
      email,
      name: (u.user_metadata?.display_name as string) || email.split("@")[0] || "User",
      mode: "supabase",
    };
  }
  if (isLocalDevMode()) {
    const raw = cookies().get(DEV_COOKIE)?.value;
    if (!raw) return null;
    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as { email: string; name: string };
      return { id: "local-dev-user", email: parsed.email, name: parsed.name, mode: "local" };
    } catch {
      return null;
    }
  }
  return null;
}
