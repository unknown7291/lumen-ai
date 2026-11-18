"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Plus, Send, Trash2, Bot, User as UserIcon, AlertCircle } from "lucide-react";

type Message = { id: string; role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; messages: Message[]; updated_at?: string };

const STORAGE_KEY = "lumen-local-conversations";

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function ChatInterface({ name, mode }: { name: string; mode: "local" | "supabase" }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const active = conversations.find((chat) => chat.id === activeId) || null;

  useEffect(() => {
    if (mode === "local") {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Conversation[];
        setConversations(saved);
        setActiveId(saved[0]?.id || null);
      } catch {}
    }
    fetch("/api/chat")
      .then((response) => response.json())
      .then((data) => {
        setConfigured(Boolean(data.configured));
        setProvider(data.provider || "");
        setModel(data.model || "");
        if (mode === "supabase" && Array.isArray(data.conversations)) {
          setConversations(data.conversations);
          setActiveId(data.conversations[0]?.id || null);
        }
      })
      .catch(() => setError("Could not load chat status."));
  }, [mode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages, streaming]);

  useEffect(() => {
    if (mode === "local") localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations, mode]);

  function updateActive(update: (chat: Conversation) => Conversation) {
    setConversations((current) => current.map((chat) => chat.id === activeId ? update(chat) : chat));
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    setError("");
    setInput("");

    let chatId = activeId;
    let chat = active;
    if (!chat) {
      chatId = uid();
      chat = { id: chatId, title: text.slice(0, 44), messages: [] };
      setConversations((current) => [chat!, ...current]);
      setActiveId(chatId);
    }

    const userMessage: Message = { id: uid(), role: "user", content: text };
    const assistantMessage: Message = { id: uid(), role: "assistant", content: "" };
    setConversations((current) => current.map((item) => item.id === chatId ? { ...item, title: item.messages.length === 0 ? text.slice(0, 44) : item.title, messages: [...item.messages, userMessage, assistantMessage] } : item));

    try {
      const conversationMessages = [...(chat.messages || []), userMessage].map((message) => ({ role: message.role, content: message.content }));
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: mode === "supabase" ? (activeId || undefined) : undefined, messages: conversationMessages }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Request failed (${response.status}).`);
      }
      if (!response.body) throw new Error("The provider returned no response stream.");

      setStreaming(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let serverConversationId = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = JSON.parse(line.slice(5).trim());
          if (payload.error) throw new Error(payload.error);
          if (payload.conversationId) serverConversationId = payload.conversationId;
          if (payload.text) {
            fullText += payload.text;
            setConversations((current) => current.map((item) => item.id === chatId ? { ...item, messages: item.messages.map((message) => message.id === assistantMessage.id ? { ...message, content: fullText } : message) } : item));
          }
        }
      }

      if (mode === "supabase" && serverConversationId) {
        setConversations((current) => current.map((item) => item.id === chatId ? { ...item, id: serverConversationId } : item));
        setActiveId(serverConversationId);
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The chat request failed.";
      setError(message);
      setConversations((current) => current.map((item) => item.id === chatId ? { ...item, messages: item.messages.map((message) => message.id === assistantMessage.id ? { ...message, content: `Error: ${message}` } : message) } : item));
    } finally {
      setStreaming(false);
    }
  }

  async function deleteChat(id: string) {
    setConversations((current) => {
      const remaining = current.filter((chat) => chat.id !== id);
      if (activeId === id) setActiveId(remaining[0]?.id || null);
      return remaining;
    });
    if (mode === "supabase") await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "delete", conversationId: id }) });
  }

  function newChat() {
    setActiveId(null);
    setError("");
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl">
      <aside className="hidden w-64 shrink-0 border-r p-3 md:flex md:flex-col">
        <button onClick={newChat} className="flex h-10 items-center justify-center gap-2 rounded-lg border bg-surface text-sm font-medium transition hover:bg-muted">
          <Plus size={16} /> New chat
        </button>
        <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {conversations.map((chat) => (
            <div key={chat.id} className={`group flex items-center rounded-lg ${activeId === chat.id ? "bg-muted" : "hover:bg-muted/60"}`}>
              <button onClick={() => setActiveId(chat.id)} className="h-10 min-w-0 flex-1 truncate px-3 text-left text-sm">{chat.title}</button>
              <button onClick={() => deleteChat(chat.id)} aria-label="Delete chat" className="mr-2 hidden text-muted-foreground group-hover:block"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {configured === false && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm">
            <AlertCircle className="mt-0.5 shrink-0 text-accent" size={16} />
            <p><strong>AI is not configured.</strong> Add <code>AI_API_KEY</code> and <code>AI_MODEL</code> to <code>.env.local</code>, then restart the server.</p>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          {!active?.messages.length ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center pt-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><Bot size={24} /></div>
              <h1 className="mt-5 text-2xl font-semibold">Hello, {name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">What would you like to work on?</p>
              {provider && <p className="mt-3 text-xs text-muted-foreground">{provider} · {model}</p>}
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {active.messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === "assistant" ? "" : "justify-end"}`}>
                  {message.role === "assistant" && <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><Bot size={15} /></div>}
                  <div className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "assistant" ? "bg-muted" : "bg-accent text-accent-foreground"}`}>
                    {message.content || (streaming ? "Thinking…" : "")}
                  </div>
                  {message.role === "user" && <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"><UserIcon size={15} /></div>}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {error && <div className="mx-4 mb-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</div>}

        <form onSubmit={sendMessage} className="p-4 pt-2">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-surface p-2 shadow-soft">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
              }}
              rows={1}
              maxLength={12000}
              placeholder="Message Lumen…"
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
            />
            <button type="submit" disabled={!input.trim() || streaming} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition disabled:cursor-not-allowed disabled:opacity-40">
              <Send size={17} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
