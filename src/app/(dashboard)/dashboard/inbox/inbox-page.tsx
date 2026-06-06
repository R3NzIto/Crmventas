"use client";

import { ArrowLeft, CircleDollarSign, Flame, Kanban, Mail, MessageCircle, Moon, Phone, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  tags: string[];
  deals: InboxDeal[];
}

interface InboxDeal {
  id: string;
  title: string;
  value: number;
  status: "open" | "won" | "lost";
  stage: {
    name: string;
    pipeline: {
      id: string;
      name: string;
    };
  };
}

interface InboxMessage {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  status: string;
  sentAt: string | null;
}

interface InboxLeadQualification {
  id: string;
  leadScore: number;
  intent: string;
  urgency: string;
  recommendedAction: string;
}

interface InboxConversation {
  id: string;
  channel: Channel;
  status: Status;
  unreadCount: number;
  lastMessageAt: string | null;
  contact: InboxContact;
  messages: InboxMessage[];
  leadQualifications: InboxLeadQualification[];
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

function leadScoreClass(score: number): string {
  if (score >= 80) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (score >= 60) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-600";
}

function statusClass(status: Status): string {
  if (status === "OPEN") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "SNOOZED") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-600";
}

function statusLabel(status: Status): string {
  if (status === "OPEN") {
    return "Pendiente";
  }
  if (status === "SNOOZED") {
    return "Pospuesta";
  }
  return "Cerrada";
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
  const selectedDeal = selected?.contact.deals[0] ?? null;

  const loadConversations = useCallback(async (): Promise<void> => {
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
  }, [channel, search, selectedId, status]);

  const loadSelected = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/conversations/${id}`);
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { data: InboxConversation };
    setSelected(payload.data);
  }, []);

  useEffect(() => {
    void loadConversations();
    const interval = window.setInterval(() => {
      void loadConversations();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) {
      void loadSelected(selectedId);
    }
  }, [loadSelected, selectedId]);

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

  async function patchConversation(action: "mark_as_read" | "close" | "reopen" | "snooze" | "create_deal" | "mark_hot_lead") {
    if (!selected) {
      return;
    }
    const response = await fetch(`/api/conversations/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    if (response.ok && (action === "create_deal" || action === "mark_hot_lead")) {
      const payload = (await response.json()) as { data: InboxConversation };
      setSelected(payload.data);
    } else {
      await loadSelected(selected.id);
    }
    await loadConversations();
  }

  return (
    <section className="grid h-[calc(100vh-64px)] overflow-hidden md:grid-cols-[20rem_1fr] xl:grid-cols-[20rem_1fr_19rem]">
      <aside className={cn("border-b border-outline-variant bg-surface-container-lowest md:border-b-0 md:border-r", selected && "hidden md:block")}>
        <div className="space-y-3 border-b border-outline-variant bg-surface-bright p-4">
          <div>
          <h1 className="text-headline-sm text-on-surface">Mensajes</h1>
          <p className="text-body-sm text-secondary">Email, SMS y WhatsApp en una sola bandeja.</p>
          </div>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en inbox" />
          <div className="flex gap-1 overflow-x-auto rounded bg-surface-container p-1">
            {(["all", "email", "sms", "whatsapp"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setChannel(item)}
                className={cn("flex-1 rounded px-2 py-1.5 text-label-sm font-semibold text-secondary", channel === item && "bg-surface-container-lowest text-primary shadow-sm")}
              >
                {item === "all" ? "Todos" : channelLabels[item]}
              </button>
            ))}
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as Status)}
            className="h-9 w-full rounded border border-outline-variant bg-surface-container-lowest px-3 text-body-sm text-on-surface"
          >
            <option value="OPEN">Abiertas</option>
            <option value="CLOSED">Cerradas</option>
            <option value="SNOOZED">Pospuestas</option>
          </select>
        </div>
        <div className="max-h-[32rem] overflow-y-auto md:h-[calc(100vh-13rem)] md:max-h-none">
          {error ? <p className="p-4 text-body-sm text-red-600">{error}</p> : null}
          {listLoading ? <p className="p-4 text-body-sm text-secondary">Cargando conversaciones...</p> : null}
          {!listLoading && !error && conversations.length === 0 ? (
            <p className="p-4 text-body-sm text-secondary">No se encontraron conversaciones.</p>
          ) : null}
          {!listLoading && !error ? conversations.map((conversation) => {
            const lastMessage = conversation.messages[0];
            const lead = conversation.leadQualifications[0];
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedId(conversation.id)}
                className={cn("relative w-full border-b border-outline-variant p-4 text-left transition-colors hover:bg-surface-container-low", selectedId === conversation.id && "bg-surface-container-low")}
              >
                {selectedId === conversation.id ? <div className="absolute bottom-0 left-0 top-0 w-1 bg-primary" /> : null}
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-tertiary-fixed text-label-md font-semibold text-tertiary">
                    {contactName(conversation.contact).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-body-sm font-semibold text-on-surface">{contactName(conversation.contact)}</p>
                      <span className="text-label-sm text-secondary">
                        {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-body-sm text-secondary">{lastMessage?.content ?? "Sin mensajes todavía"}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs", channelStyles[conversation.channel])}>
                        <ChannelIcon channel={conversation.channel} />
                        {channelLabels[conversation.channel]}
                      </span>
                      {conversation.unreadCount > 0 ? (
                        <span className="rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">{conversation.unreadCount}</span>
                      ) : null}
                      {lead ? <span className={cn("rounded px-1.5 py-0.5 text-xs", leadScoreClass(lead.leadScore))}>Lead {lead.leadScore}</span> : null}
                      {conversation.contact.deals[0] ? (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">Deal</span>
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
            <header className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest p-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" className="md:hidden" onClick={() => setSelected(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-headline-sm text-on-surface">{contactName(selected.contact)}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-body-sm text-secondary">{channelLabels[selected.channel]}</span>
                    <span className={cn("rounded px-2 py-0.5 text-xs", statusClass(selected.status))}>{statusLabel(selected.status)}</span>
                    {selected.unreadCount > 0 ? <span className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">Sin leer</span> : null}
                    {selected.contact.tags.includes("hot-lead") ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Hot lead</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => void patchConversation("mark_as_read")}>
                  Marcar leída
                </Button>
                <Button variant="outline" onClick={() => void patchConversation("snooze")}>
                  <Moon className="h-4 w-4" />
                  Posponer
                </Button>
                <Button variant="outline" onClick={() => void patchConversation(selected.status === "OPEN" ? "close" : "reopen")}>
                  {selected.status === "OPEN" ? "Cerrar" : "Reabrir"}
                </Button>
              </div>
            </header>
            {selected.leadQualifications[0] ? (
              <div className="border-b border-outline-variant bg-emerald-50 px-4 py-3 text-body-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded px-2 py-0.5 text-xs font-medium", leadScoreClass(selected.leadQualifications[0].leadScore))}>
                    Lead {selected.leadQualifications[0].leadScore}
                  </span>
                  <span className="rounded bg-background px-2 py-0.5 text-xs">{selected.leadQualifications[0].intent}</span>
                  <span className="rounded bg-background px-2 py-0.5 text-xs">{selected.leadQualifications[0].urgency}</span>
                </div>
                <p className="mt-2 text-emerald-950">{selected.leadQualifications[0].recommendedAction}</p>
              </div>
            ) : null}
            <div className="grid gap-3 border-b border-outline-variant bg-surface-container-lowest p-4 lg:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-secondary" />
                  <p className="text-body-sm font-semibold text-on-surface">{selectedDeal ? selectedDeal.title : "Sin oportunidad abierta"}</p>
                  {selectedDeal ? <span className="rounded bg-surface-container px-2 py-0.5 text-label-sm text-secondary">{selectedDeal.stage.name}</span> : null}
                </div>
                <p className="text-body-sm text-secondary">
                  {selectedDeal
                    ? `${selectedDeal.stage.pipeline.name} - $${selectedDeal.value.toLocaleString()}`
                    : "Crea una oportunidad para hacer seguimiento desde el pipeline."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedDeal ? (
                  <Button asChild variant="outline">
                    <Link href="/dashboard/pipelines">
                      <Kanban className="h-4 w-4" />
                      Ver pipeline
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => void patchConversation("create_deal")}>
                    <CircleDollarSign className="h-4 w-4" />
                    Crear deal
                  </Button>
                )}
                <Button variant="outline" onClick={() => void patchConversation("mark_hot_lead")}>
                  <Flame className="h-4 w-4" />
                  Hot lead
                </Button>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-background p-5">
              {selectedMessages.length === 0 ? (
                <div className="flex h-full min-h-[16rem] items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center">
                  <div>
                    <MessageCircle className="mx-auto mb-3 h-8 w-8 text-secondary" />
                    <p className="text-body-sm font-semibold text-on-surface">Sin mensajes todavía</p>
                    <p className="mt-1 text-body-sm text-secondary">Escribe una respuesta para iniciar el seguimiento.</p>
                  </div>
                </div>
              ) : (
                selectedMessages.map((message) => (
                  <div key={message.id} className={cn("flex", message.direction === "outbound" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-3 py-2 text-body-sm shadow-sm",
                        message.direction === "outbound" ? "bg-primary text-primary-foreground" : "border border-outline-variant bg-surface-container-lowest text-on-surface"
                      )}
                    >
                      <p>{message.content}</p>
                      <p className={cn("mt-1 text-xs", message.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {message.sentAt ? new Date(message.sentAt).toLocaleString() : message.status}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2 border-t border-outline-variant bg-surface-container-lowest p-4">
              <Input value={content} onChange={(event) => setContent(event.target.value)} placeholder="Escribir respuesta" />
              <Button onClick={() => void sendMessage()} disabled={loading}>
                <Send className="h-4 w-4" />
                Enviar
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-body-sm text-secondary">Selecciona una conversación para ver el hilo.</div>
        )}
      </main>
      <aside className="hidden border-l border-outline-variant bg-surface-container-lowest xl:flex xl:flex-col">
        {selected ? (
          <>
            <div className="border-b border-outline-variant p-gutter text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-tertiary-fixed text-headline-sm font-semibold text-tertiary">
                {contactName(selected.contact).slice(0, 2).toUpperCase()}
              </div>
              <h3 className="text-headline-sm text-on-surface">{contactName(selected.contact)}</h3>
              <p className="text-body-sm text-secondary">{selected.contact.email ?? selected.contact.phone ?? "Sin dato principal"}</p>
            </div>
            <div className="border-b border-outline-variant p-gutter">
              <h4 className="mb-3 text-label-md uppercase text-secondary">Información del contacto</h4>
              <div className="space-y-2 text-body-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-secondary">Email</span>
                  <span className="truncate text-on-surface">{selected.contact.email ?? "-"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-secondary">Teléfono</span>
                  <span className="text-on-surface">{selected.contact.phone ?? "-"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-secondary">Canal</span>
                  <span className="text-on-surface">{channelLabels[selected.channel]}</span>
                </div>
              </div>
            </div>
            <div className="border-b border-outline-variant bg-surface-bright p-gutter">
              <h4 className="mb-2 flex items-center gap-1 text-label-md uppercase text-secondary">
                <Sparkles className="h-4 w-4 text-tertiary" />
                Score IA
              </h4>
              {selected.leadQualifications[0] ? (
                <>
                  <div className="mb-1 h-2 rounded-full bg-surface-container">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${selected.leadQualifications[0].leadScore}%` }} />
                  </div>
                  <div className="mb-2 flex justify-between text-label-sm text-secondary">
                    <span>Frio</span>
                    <span>Caliente</span>
                  </div>
                  <p className="border-l-2 border-primary pl-2 text-body-sm text-on-surface">{selected.leadQualifications[0].recommendedAction}</p>
                </>
              ) : (
                <p className="text-body-sm text-secondary">Sin calificación IA para esta conversación.</p>
              )}
            </div>
            <div className="flex-1 p-gutter">
              <h4 className="mb-3 text-label-md uppercase text-secondary">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {selected.contact.tags.length === 0 ? (
                  <span className="text-body-sm text-secondary">Sin tags</span>
                ) : (
                  selected.contact.tags.map((tag) => (
                    <span key={tag} className="rounded bg-surface-container px-2 py-0.5 text-label-sm text-secondary">
                      {tag}
                    </span>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-body-sm text-secondary">Selecciona una conversación para ver contexto.</div>
        )}
      </aside>
    </section>
  );
}
