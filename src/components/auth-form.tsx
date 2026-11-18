"use client";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";
import { Logo } from "@/components/logo";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-xl bg-accent font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border bg-surface px-3.5 text-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/40";

export function AuthForm({ mode, localDev }: { mode: "login" | "signup"; localDev: boolean }) {
  const [state, action] = useFormState<AuthState, FormData>(mode === "login" ? signIn : signUp, {});
  const isLogin = mode === "login";
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo size={34} /></div>
        <div className="rounded-xl2 border bg-surface p-6 shadow-soft">
          <h1 className="text-xl font-semibold">{isLogin ? "Welcome back" : "Create your account"}</h1>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">
            {isLogin ? "Log in to continue your conversations." : "Your chats and memories stay private to you."}
          </p>
          <form action={action} className="space-y-3">
            {!isLogin && (
              <input name="name" type="text" placeholder="Your name" autoComplete="name" required className={inputClass} />
            )}
            <input name="email" type="email" placeholder="Email" autoComplete="email" required className={inputClass} />
            <input
              name="password"
              type="password"
              placeholder="Password (min 8 characters)"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={8}
              className={inputClass}
            />
            {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
            {state.message && <p role="status" className="text-sm text-muted-foreground">{state.message}</p>}
            <Submit label={isLogin ? "Log in" : "Sign up"} />
          </form>
          {localDev && (
            <p className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              <strong>Local dev mode:</strong> Supabase isn’t configured, so any email and password will work and nothing is
              stored. This mode is disabled in production.
            </p>
          )}
        </div>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isLogin ? "New here? " : "Already have an account? "}
          <Link href={isLogin ? "/signup" : "/login"} className="font-medium text-foreground underline-offset-4 hover:underline">
            {isLogin ? "Create an account" : "Log in"}
          </Link>
        </p>
      </div>
    </div>
  );
}
