"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; mode: "supabase" | "local" };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex h-screen overflow-hidden">
      <motion.aside
        initial={false}
        animate={{ width: open ? 272 : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="shrink-0 overflow-hidden border-r bg-surface"
        aria-hidden={!open}
      >
        <div className="flex h-full w-[272px] flex-col p-4">
          <Logo />
          <div className="mt-6 flex-1 text-sm text-muted-foreground">
            Conversation history arrives in Milestone 3.
          </div>
          <div className="border-t pt-4">
            <div className="mb-3 min-w-0">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <LogOut size={16} /> Log out
              </button>
            </form>
          </div>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {open ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          <ThemeToggle />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
