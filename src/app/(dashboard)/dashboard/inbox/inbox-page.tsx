"use client";

import { ArrowLeft, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Channel = "email" | "sms" | "whatsapp";
type Status = "OPEN" | "CLOSED" | "SNOOZED";

interface InboxContact {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

interface InboxMessage {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  status: string;
  sentAt: string | null;
}

interface InboxConversation {
  id: string;
  channel: Channel;
  status: Status;
  unreadCount: number;
  lastMessageAt: string | null;
  contact: InboxContact;
  messages: InboxMessage[];
}

const channelLabels: Record<Channel, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp"
};

const channelStyles: Record<Channel, string> = {
  email: "bg-blue-100 text-blue-700",
  sms: "bg-amber-100 text-amber-700",
  whatsapp: "bg-emerald-100 text-emerald-700"
};

function contactName(contact: InboxContact): string {
  return `${contact.firstName} ${contact.lastName}`.trim() || contact.email || contact.phone || "Contacto desconocido";
}

function ChannelIcon({ channel }: { channel: Channel }) {
  if (channel === "email") {
    return <Mail className="h-3.5 w-3.5" />;
  }
  if (channel === "sms") {
    return <Phone className="h-3.5 w-3.5" />;
  }
  return <MessageCircle className="h-3.5 w-3.5" />;
}

export function InboxPage() {
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<InboxConversation | null>(null);
  const [channel, setChannel] = useState<Channel | "all">("all");
  const [status, setStatus] = useState<Status>("OPEN");
  const [search, setSearch] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedMessages = useMemo(() => selected?.messages ?? [], [selected]);

  async function loadConversations() {
    setListLoading(true);
    setError(null);
    const params = new URLSearchParams({ status, search });
    if (channel !== "all") {
      params.set("channel", channel);
    }
    const response = await fetch(`/api/conversations?${params.toString()}`);
    if (!response.ok) {
      setError("No se pudieron cargar las conversaciones");
      setListLoading(false);
      return;
    }
    const payload = (await response.json()) as { data: InboxConversation[] };
    setConversations(payload.data);
    if (!selectedId && payload.data[0]) {
      setSelectedId(payload.data[0].id);
    }
    setListLoading(false);
  }

  async function loadSelected(id: string) {
    const response = await fetch(`/api/conversations/${id}`);
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { data: InboxConversation };
    setSelected(payload.data);
  }

  useEffect(() => {
    void loadConversations();
    const interval = window.setInterval(() => {
      void loadConversations();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [channel, status, search]);

  useEffect(() => {
    if (selectedId) {
      void loadSelected(selectedId);
    }
  }, [selectedId]);

  async function sendMessage() {
    if (!selected || !content.trim()) {
      return;
    }
    const optimistic: InboxMessage = {
      id: crypto.randomUUID(),
      direction: "outbound",
      content,
      status: "sending",
      sentAt: new Date().toISOString()
    };
    setSelected({ ...selected, messages: [...selected.messages, optimistic] });
    setContent("");
    setLoading(true);
    const response = await fetch(`/api/conversations/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: optimistic.content })
    });
    setLoading(false);
    if (response.ok) {
      await loadSelected(selected.id);
      await loadConversations();
    }
  }

  async function patchConversation(action: "mark_as_read" | "close" | "reopen") {
    if (!selected) {
      return;
    }
    await fetch(`/api/conversations/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    await loadSelected(selected.id);
    await loadConversations();
  }

  return (
    <section className="grid min-h-screen overflow-hidden md:h-screen md:grid-cols-[22rem_1fr]">
      <aside className={cn("border-b bg-background md:border-b-0 md:border-r", selected && "hidden md:block")}>
        <div className="space-y-3 border-b p-4">
          <div>
          <h1 className="text-xl font-semibold">Inbox</h1>
          <p className="text-sm text-muted-foreground">Conversaciones unificadas de email, SMS y WhatsApp.</p>
          </div>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en inbox" />
          <div className="flex gap-1 rounded-md bg-muted p-1">
            {(["all", "email", "sms", "whatsapp"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setChannel(item)}
                className={cn("flex-1 rounded px-2 py-1.5 text-xs font-medium", channel === item && "bg-background shadow-sm")}
              >
                {item === "all" ? "Todos" : channelLabels[item]}
              </button>
            ))}
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as Status)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="OPEN">Abiertas</option>
            <option value="CLOSED">Cerradas</option>
            <option value="SNOOZED">Pospuestas</option>
          </select>
        </div>
        <div className="max-h-[32rem] overflow-y-auto md:h-[calc(100vh-13rem)] md:max-h-none">
          {error ? <p className="p-4 text-sm text-red-600">{error}</p> : null}
          {listLoading ? <p className="p-4 text-sm text-muted-foreground">Cargando conversaciones...</p> : null}
          {!listLoading && !error && conversations.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No se encontraron conversaciones.</p>
          ) : null}
          {!listLoading && !error ? conversations.map((conversation) => {
            const lastMessage = conversation.messages[0];
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedId(conversation.id)}
                className={cn("w-full border-b p-4 text-left hover:bg-muted/60", selectedId === conversation.id && "bg-muted")}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {contactName(conversation.contact).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{contactName(conversation.contact)}</p>
                      <span className="text-xs text-muted-foreground">
                        {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{lastMessage?.content ?? "Sin mensajes todavia"}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs", channelStyles[conversation.channel])}>
                        <ChannelIcon channel={conversation.channel} />
                        {channelLabels[conversation.channel]}
                      </span>
                      {conversation.unreadCount > 0 ? (
                        <span className="rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">{conversation.unreadCount}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          }) : null}
        </div>
      </aside>

      <main className={cn("flex min-w-0 flex-col", !selected && "hidden md:flex")}>
        {selected ? (
          <>
            <header className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" className="md:hidden" onClick={() => setSelected(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="font-semibold">{contactName(selected.contact)}</h2>
                  <p className="text-sm text-muted-foreground">{channelLabels[selected.channel]}</p>
                </div>
              </div>
              <div className="flex gap-2">
                  <Button variant="outline" onClick={() => void patchConversation("mark_as_read")}>
                  Marcar leida
                </Button>
                <Button variant="outline" onClick={() => void patchConversation(selected.status === "OPEN" ? "close" : "reopen")}>
                  {selected.status === "OPEN" ? "Cerrar" : "Reabrir"}
                </Button>
              </div>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-5">
              {selectedMessages.map((message) => (
                <div key={message.id} className={cn("flex", message.direction === "outbound" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm",
                      message.direction === "outbound" ? "bg-primary text-primary-foreground" : "border bg-background"
                    )}
                  >
                    <p>{message.content}</p>
                    <p className={cn("mt-1 text-xs", message.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {message.sentAt ? new Date(message.sentAt).toLocaleString() : message.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t p-4">
              <Input value={content} onChange={(event) => setContent(event.target.value)} placeholder="Escribir respuesta" />
              <Button onClick={() => void sendMessage()} disabled={loading}>
                <Send className="h-4 w-4" />
                Enviar
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Selecciona una conversacion para ver el hilo.</div>
        )}
      </main>
    </section>
  );
}
