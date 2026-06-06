"use client";

import { Flame, RefreshCw, Search, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LeadIntent = "pricing" | "demo" | "buying_interest" | "support" | "spam" | "follow_up" | "other";
type LeadUrgency = "low" | "medium" | "high";

interface LeadQualification {
  id: string;
  isLead: boolean;
  leadScore: number;
  intent: LeadIntent;
  urgency: LeadUrgency;
  summary: string;
  recommendedAction: string;
  suggestedTags: string[];
  createdAt: string;
  contact: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  conversation: {
    id: string;
    channel: "email" | "sms" | "whatsapp";
  };
  message: {
    content: string;
    sentAt: string | null;
  };
}

function contactName(lead: LeadQualification): string {
  return `${lead.contact.firstName} ${lead.contact.lastName}`.trim() || lead.contact.email || lead.contact.phone || "Contacto desconocido";
}

function scoreClass(score: number): string {
  if (score >= 80) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (score >= 60) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-600";
}

export default function LeadsRoute() {
  const [leads, setLeads] = useState<LeadQualification[]>([]);
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("60");
  const [intent, setIntent] = useState("");
  const [urgency, setUrgency] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeads = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ minScore, isLead: "true" });
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (intent) {
      params.set("intent", intent);
    }
    if (urgency) {
      params.set("urgency", urgency);
    }
    const response = await fetch(`/api/leads?${params.toString()}`);
    if (!response.ok) {
      setError("No se pudieron cargar los leads IA");
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as { data: LeadQualification[] };
    setLeads(payload.data);
    setLoading(false);
  }, [intent, minScore, search, urgency]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadLeads();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [loadLeads]);

  return (
    <section className="flex min-h-[calc(100vh-64px)] flex-col gap-stack-lg p-container-padding">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-label-sm uppercase text-primary">Modulo de inteligencia</p>
          <h1 className="flex items-center gap-2 text-display-lg text-on-background">
            Leads calificados
            <Sparkles className="h-5 w-5 text-primary" />
          </h1>
          <p className="max-w-2xl text-body-md text-secondary">Mensajes clasificados como oportunidades comerciales por actividad reciente.</p>
        </div>
        <Button variant="outline" onClick={() => void loadLeads()} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Recalcular
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-stack-sm shadow-sm">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
          <Input className="border-transparent bg-transparent pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar empresa, contacto o mensaje" />
        </div>
        <Input className="w-28" value={minScore} onChange={(event) => setMinScore(event.target.value)} type="number" min="0" max="100" />
        <select value={intent} onChange={(event) => setIntent(event.target.value)} className="h-9 rounded border border-outline-variant bg-surface px-3 text-body-sm text-on-surface">
          <option value="">Todos los intereses</option>
          <option value="pricing">Precio</option>
          <option value="demo">Demo</option>
          <option value="buying_interest">Interes de compra</option>
          <option value="follow_up">Seguimiento</option>
          <option value="support">Soporte</option>
          <option value="spam">Spam</option>
          <option value="other">Otro</option>
        </select>
        <select value={urgency} onChange={(event) => setUrgency(event.target.value)} className="h-9 rounded border border-outline-variant bg-surface px-3 text-body-sm text-on-surface">
          <option value="">Todas las urgencias</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
        </select>
      </div>

      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-body-sm text-red-700">{error}</div> : null}

      <div className="flex flex-col gap-unit">
        {loading ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center text-body-sm text-secondary">Cargando leads IA...</p>
        ) : leads.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center text-body-sm text-secondary">No hay leads calificados para estos filtros.</p>
        ) : (
          leads.map((lead) => (
            <article key={lead.id} className="grid gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-stack-md shadow-sm transition-colors hover:bg-surface-bright xl:grid-cols-[8rem_15rem_1fr_17rem]">
              <div className="flex items-center justify-center border-b border-outline-variant pb-4 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-stack-md">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary-fixed bg-surface text-headline-sm font-semibold text-primary">
                  {lead.leadScore}
                </div>
              </div>
              <div className="space-y-1 xl:border-r xl:border-outline-variant xl:pr-stack-md">
                <h2 className="text-headline-sm text-on-surface">{contactName(lead)}</h2>
                <p className="text-body-sm text-secondary">{lead.contact.email ?? lead.contact.phone ?? "Sin dato de contacto"}</p>
                <p className="text-label-sm text-secondary">{new Date(lead.createdAt).toLocaleString()}</p>
              </div>
              <div className="space-y-2 xl:border-r xl:border-outline-variant xl:pr-stack-md">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-label-sm ${scoreClass(lead.leadScore)}`}>
                      {lead.leadScore >= 80 ? <Flame className="h-3 w-3" /> : null}
                      Score {lead.leadScore}
                    </span>
                    <span className="rounded bg-surface-container px-2 py-0.5 text-label-sm text-secondary">{lead.conversation.channel}</span>
                    <span className="rounded bg-surface-container px-2 py-0.5 text-label-sm text-secondary">{lead.intent}</span>
                    <span className="rounded bg-surface-container px-2 py-0.5 text-label-sm text-secondary">{lead.urgency}</span>
                  </div>
                  <p className="text-body-sm text-on-surface">{lead.summary}</p>
                  <blockquote className="rounded bg-surface-container-low p-3 text-body-sm text-secondary">{lead.message.content}</blockquote>
                </div>
                <div className="flex flex-col justify-center rounded bg-surface-container-low p-stack-md">
                  <p className="mb-2 flex items-center gap-1 text-label-sm uppercase text-primary">
                    <Sparkles className="h-4 w-4" />
                    Proximo paso
                  </p>
                  <p className="mb-3 text-body-sm font-semibold text-on-surface">{lead.recommendedAction}</p>
                  <div className="flex flex-wrap gap-1">
                    {lead.suggestedTags.map((tag) => (
                      <span key={tag} className="rounded bg-surface-container px-2 py-0.5 text-label-sm text-secondary">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Button className="mt-3 w-full">
                    <Send className="h-4 w-4" />
                    Contactar
                  </Button>
                </div>
              </article>
          ))
        )}
      </div>
    </section>
  );
}
