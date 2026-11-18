import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

function providerConfig() {
  const provider = (process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? "openai" : process.env.OPENROUTER_API_KEY ? "openrouter" : process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.GEMINI_API_KEY ? "gemini" : "")).toLowerCase();
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || "";
  const model = process.env.AI_MODEL || (provider === "anthropic" ? "claude-3-5-sonnet-latest" : provider === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini");
  return { provider, apiKey, model };
}

async function createProviderResponse(messages: ChatMessage[]) {
  const { provider, apiKey, model } = providerConfig();
  if (!provider || !apiKey) throw new Error("No AI provider configured. Add an API key to .env.local.");

  if (provider === "anthropic") {
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 2048, stream: true, messages: messages.filter((m) => m.role !== "system"), system: messages.find((m) => m.role === "system")?.content }),
    });
  }

  if (provider === "gemini") {
    const contents = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const systemInstruction = messages.find((m) => m.role === "system")?.content;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
    return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents, ...(systemInstruction ? { system_instruction: { parts: [{ text: systemInstruction }] } } : {}) }) });
  }

  const baseUrl = process.env.AI_BASE_URL || (provider === "openrouter" ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1");
  return fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}`, ...(provider === "openrouter" ? { "HTTP-Referer": process.env.APP_URL || "http://localhost:3000", "X-Title": "Lumen" } : {}) },
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.7 }),
  });
}

function sseStream(upstream: Response, provider: string, onText: (text: string) => void) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!upstream.body) { controller.close(); return; }
      const reader = upstream.body.getReader();
      let buffer = "";
      let sentDone = false;
      const send = (payload: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              let text = "";
              if (provider === "anthropic") {
                if (json.type === "content_block_delta") text = json.delta?.text || "";
              } else if (provider === "gemini") {
                text = json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
              } else {
                text = json.choices?.[0]?.delta?.content || "";
              }
              if (text) { onText(text); send({ text }); }
            } catch {}
          }
        }
        sentDone = true;
        send({ done: true });
        controller.close();
      } catch (error) {
        send({ error: error instanceof Error ? error.message : "Streaming failed." });
        controller.close();
      }
    },
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { provider, apiKey, model } = providerConfig();
  if (!isSupabaseConfigured()) return NextResponse.json({ configured: Boolean(provider && apiKey), provider, model, conversations: [] });

  const supabase = createClient();
  const { data: conversations, error } = await supabase.from("conversations").select("id,title,provider,model,created_at,updated_at").eq("user_id", user.id).eq("archived", false).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const result = [];
  for (const conversation of conversations || []) {
    const { data: messages } = await supabase.from("messages").select("id,role,content,created_at").eq("conversation_id", conversation.id).order("created_at", { ascending: true });
    result.push({ ...conversation, messages: messages || [] });
  }
  return NextResponse.json({ configured: Boolean(provider && apiKey), provider, model, conversations: result });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();

  if (body.action === "delete" && body.conversationId) {
    if (!isSupabaseConfigured()) return NextResponse.json({ ok: true });
    const supabase = createClient();
    await supabase.from("conversations").delete().eq("id", body.conversationId).eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  }

  const messages = (body.messages as ChatMessage[] | undefined)?.filter((m) => m.role === "user" || m.role === "assistant") || [];
  const latestUser = [...messages].reverse().find((m) => m.role === "user")?.content;
  if (!latestUser) return NextResponse.json({ error: "A message is required." }, { status: 400 });

  const { provider, apiKey, model } = providerConfig();
  if (!provider || !apiKey) return NextResponse.json({ error: "Add an AI API key to .env.local, then restart the server." }, { status: 503 });

  let conversationId = body.conversationId as string | undefined;
  let supabase = isSupabaseConfigured() ? createClient() : null;
  if (supabase) {
    if (!conversationId) {
      const title = latestUser.trim().slice(0, 44) || "New chat";
      const { data, error } = await supabase.from("conversations").insert({ user_id: user.id, title, provider, model }).select("id").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      conversationId = data.id;
    }
    await supabase.from("messages").insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: latestUser });
  }

  let upstream: Response;
  try {
    upstream = await createProviderResponse(messages);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not reach the AI provider." }, { status: 502 });
  }
  if (!upstream.ok) {
    const detail = await upstream.text();
    return NextResponse.json({ error: `AI provider error (${upstream.status}). ${detail.slice(0, 500)}` }, { status: 502 });
  }

  let assistantText = "";
  const stream = sseStream(upstream, provider, (text) => { assistantText += text; });
  const persistedStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        if (supabase && conversationId && assistantText) {
          await supabase.from("messages").insert({ conversation_id: conversationId, user_id: user.id, role: "assistant", content: assistantText });
          await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", user.id);
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ conversationId })}\n\n`));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new NextResponse(persistedStream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-conversation-id": conversationId || "" } });
}
