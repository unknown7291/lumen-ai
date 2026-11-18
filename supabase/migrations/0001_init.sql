-- Lumen — Milestone 1 schema. Run in Supabase: SQL Editor -> New query -> paste -> Run.

-- Profiles (one per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

-- Per-user settings (API keys are NOT stored here; handled securely in Milestone 2)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null default 'anthropic',
  model text,
  temperature real not null default 0.7 check (temperature >= 0 and temperature <= 2),
  max_tokens integer not null default 2048 check (max_tokens between 64 and 32000),
  system_prompt text,
  memory_enabled boolean not null default true,
  web_search_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  provider text,
  model text,
  pinned boolean not null default false,
  archived boolean not null default false,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

-- Row Level Security: every user sees only their own rows
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "settings_select_own" on public.user_settings for select using (auth.uid() = user_id);
create policy "settings_insert_own" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "settings_update_own" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "conversations_select_own" on public.conversations for select using (auth.uid() = user_id);
create policy "conversations_insert_own" on public.conversations for insert with check (auth.uid() = user_id);
create policy "conversations_update_own" on public.conversations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "conversations_delete_own" on public.conversations for delete using (auth.uid() = user_id);

create policy "messages_select_own" on public.messages for select using (auth.uid() = user_id);
create policy "messages_insert_own" on public.messages for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
create policy "messages_update_own" on public.messages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "messages_delete_own" on public.messages for delete using (auth.uid() = user_id);
