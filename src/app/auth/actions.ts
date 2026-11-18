"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEV_COOKIE } from "@/lib/auth";
import { isLocalDevMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
});
const signUpSchema = credentials.extend({
  name: z.string().trim().min(1, "Enter your name.").max(60),
});

const NOT_CONFIGURED =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see README).";

function startDevSession(email: string, name: string) {
  cookies().set(DEV_COOKIE, encodeURIComponent(JSON.stringify({ email, name })), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: "Invalid email or password." };
  } else if (isLocalDevMode()) {
    startDevSession(parsed.data.email, parsed.data.email.split("@")[0]);
  } else {
    return { error: NOT_CONFIGURED };
  }
  redirect("/chat");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { display_name: parsed.data.name } },
    });
    if (error) return { error: error.message };
    if (!data.session) {
      return { message: "Check your email to confirm your account, then log in." };
    }
  } else if (isLocalDevMode()) {
    startDevSession(parsed.data.email, parsed.data.name);
  } else {
    return { error: NOT_CONFIGURED };
  }
  redirect("/chat");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    await createClient().auth.signOut();
  }
  cookies().delete(DEV_COOKIE);
  redirect("/login");
}
