<div align="center">

# Lumen AI

### Your personal AI workspace — fast, private, and beautifully simple.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Ready-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)

**Chat with leading AI providers. Save every conversation. Stay in control of your data.**

[Getting Started](#-quick-start) • [Features](#-features) • [Configuration](#-ai-provider-configuration) • [Supabase](#-database-persistence)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 💬 Streaming conversations

Responses appear live as the model generates them, for a natural and responsive chat experience.

</td>
<td width="50%">

### 🤖 Multiple AI providers

Use OpenAI, OpenRouter, Anthropic, Google Gemini, or any OpenAI-compatible endpoint.

</td>
</tr>
<tr>
<td width="50%">

### 🧭 Beautiful workspace

A clean, responsive interface with a collapsible sidebar, local chats, and light/dark themes.

</td>
<td width="50%">

### 🔐 Private by design

API keys stay on the server. Supabase authentication and row-level security protect saved conversations.

</td>
</tr>
<tr>
<td width="50%">

### 💾 Local-first mode

No accounts or database required. Local development conversations persist in browser storage.

</td>
<td width="50%">

### ☁️ Optional Supabase storage

Connect Supabase to securely store profiles, settings, conversations, and messages.

</td>
</tr>
</table>

## 🚀 Quick start

### 1. Install prerequisites

Install [Node.js 18.18 or newer](https://nodejs.org) and clone the repository.

```bash
git clone https://github.com/unknown7291/lumen-ai.git
cd lumen-ai
npm install
```

### 2. Add an AI provider

Create `.env.local` in the project root:

```env
AI_PROVIDER=openai
AI_API_KEY=your_api_key
AI_MODEL=gpt-4o-mini
```

Then start Lumen:

```bash
npm run dev
```

Open **http://localhost:3000**. Sign in with any valid email and a password of at least eight characters in local mode.

## 🔌 AI provider configuration

| Provider | `AI_PROVIDER` | Example model | API key variable |
|---|---|---|---|
| OpenAI | `openai` | `gpt-4o-mini` | `AI_API_KEY` or `OPENAI_API_KEY` |
| OpenRouter | `openrouter` | `openai/gpt-4o-mini` | `AI_API_KEY` or `OPENROUTER_API_KEY` |
| Anthropic | `anthropic` | `claude-3-5-sonnet-latest` | `AI_API_KEY` or `ANTHROPIC_API_KEY` |
| Google Gemini | `gemini` | `gemini-1.5-flash` | `AI_API_KEY` or `GEMINI_API_KEY` |

For an OpenAI-compatible service:

```env
AI_PROVIDER=openai
AI_BASE_URL=https://api.example.com/v1
AI_API_KEY=your_api_key
AI_MODEL=your_model
```

Restart the development server whenever environment variables change.

## 💾 Database persistence

Browser-only mode requires no Supabase setup. Chat history is saved to local storage and remains in the current browser.

To enable account authentication and database persistence:

1. Create a project at [Supabase](https://supabase.com).
2. Open **SQL Editor** and run `supabase/migrations/0001_init.sql`.
3. Copy the project URL and public anonymous key from **Project Settings → API**.
4. Add them to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Restart `npm run dev` after changing Supabase configuration.

## 🛠️ Development

```bash
npm run typecheck   # Check TypeScript
npm run build       # Create a production build
npm run start       # Serve the production build
```

## 🧱 Technology

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Supabase SSR
- Zod authentication validation
- Server-Sent Events for streaming
- Framer Motion and Lucide icons

## 🔒 Security

- Never commit `.env.local` or API keys.
- Keep provider secrets in server-side environment variables.
- Supabase tables use Row Level Security for per-user isolation.
- Authentication cookies are HTTP-only, and the Supabase anon key is not a server secret.

## 🗺️ Project status

- [x] Authentication and local development mode
- [x] Light and dark themes
- [x] Responsive application shell
- [x] Multiple AI provider support
- [x] Streaming chat interface
- [x] Local chat history
- [x] Supabase database schema
- [ ] Markdown and rich code rendering
- [ ] Conversation search, rename, pin, and archive
- [ ] File uploads and voice mode

---

<div align="center">

Built with Next.js, Supabase, and the modern AI ecosystem.

</div>
