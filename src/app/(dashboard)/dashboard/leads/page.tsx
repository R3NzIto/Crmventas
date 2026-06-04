"use client";

import { RefreshCw, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
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

  async function loadLeads(): Promise<void> {
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
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadLeads();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search, minScore, intent, urgency]);

  return (
    <section className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="h-5 w-5" />
            Leads IA
          </h1>
          <p className="text-sm text-muted-foreground">Mensajes clasificados como oportunidades comerciales.</p>
        </div>
        <Button variant="outline" onClick={() => void loadLeads()} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-80 max-w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar resumen, contacto o mensaje" />
        </div>
        <Input className="w-32" value={minScore} onChange={(event) => setMinScore(event.target.value)} type="number" min="0" max="100" />
        <select value={intent} onChange={(event) => setIntent(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="">Todos los intereses</option>
          <option value="pricing">Precio</option>
          <option value="demo">Demo</option>
          <option value="buying_interest">Interes de compra</option>
          <option value="follow_up">Seguimiento</option>
          <option value="support">Soporte</option>
          <option value="spam">Spam</option>
          <option value="other">Otro</option>
        </select>
        <select value={urgency} onChange={(event) => setUrgency(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="">Todas las urgencias</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
        </select>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="rounded-lg border">
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Cargando leads IA...</p>
        ) : leads.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No hay leads calificados para estos filtros.</p>
        ) : (
          <div className="divide-y">
            {leads.map((lead) => (
              <article key={lead.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_14rem]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{contactName(lead)}</h2>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">{lead.conversation.channel}</span>
                    <span className={`rounded px-2 py-0.5 text-xs ${scoreClass(lead.leadScore)}`}>Puntaje {lead.leadScore}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">{lead.intent}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">{lead.urgency}</span>
                  </div>
                  <p className="text-sm">{lead.summary}</p>
                  <p className="text-sm text-muted-foreground">{lead.recommendedAction}</p>
                  <blockquote className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{lead.message.content}</blockquote>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleString()}</p>
                  <div className="flex flex-wrap gap-1">
                    {lead.suggestedTags.map((tag) => (
                      <span key={tag} className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
