import { Activity, ArrowRight, CircleDollarSign, Inbox, Kanban, Sparkles, Users, Workflow } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getDashboardMetrics } from "@/services/dashboard-metrics.service";

function scoreClass(score: number): string {
  if (score >= 80) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (score >= 60) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-600";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: Date | null): string {
  if (!value) {
    return "Sin actividad";
  }
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

const quickActions = [
  { href: "/dashboard/contacts", label: "Ver contactos", icon: Users },
  { href: "/dashboard/inbox", label: "Responder inbox", icon: Inbox },
  { href: "/dashboard/leads", label: "Priorizar leads IA", icon: Sparkles },
  { href: "/dashboard/pipelines", label: "Gestionar pipeline", icon: Kanban },
  { href: "/dashboard/workflows", label: "Automatizaciones", icon: Workflow }
];

export default async function DashboardRoute() {
  const session = await getServerSession(authOptions);
  const agencyId = session?.user.agencyId;
  if (!agencyId) {
    redirect("/login");
  }

  const metrics = await getDashboardMetrics(agencyId);

  return (
    <section className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Resumen comercial</h1>
          <p className="text-sm text-muted-foreground">Actividad de ventas, leads e inbox del workspace.</p>
        </div>
        <Link
          href="/dashboard/pipelines"
          className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted"
        >
          <CircleDollarSign className="h-4 w-4" />
          Abrir pipeline
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.cards.map((card) => (
          <article key={card.label} className="rounded-lg border bg-background p-4">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold">{card.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{card.helper}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border bg-background">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="font-semibold">Pipeline activo</h2>
              <p className="text-sm text-muted-foreground">Deals abiertos por etapa.</p>
            </div>
            <Link href="/dashboard/pipelines" className="text-sm font-medium text-primary hover:underline">
              Ver tablero
            </Link>
          </div>
          <div className="space-y-3 p-4">
            {metrics.pipelineStages.length === 0 ? (
              <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Todavia no hay pipeline configurado.</p>
            ) : (
              metrics.pipelineStages.map((stage) => (
                <div key={stage.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-medium">{stage.name}</p>
                    <p className="text-sm text-muted-foreground">{stage.dealCount} oportunidades abiertas</p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(stage.value)}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-background">
          <div className="border-b p-4">
            <h2 className="font-semibold">Accesos rápidos</h2>
            <p className="text-sm text-muted-foreground">Entradas directas al flujo diario.</p>
          </div>
          <div className="grid gap-2 p-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href} className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted">
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border bg-background">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="font-semibold">Leads IA prioritarios</h2>
              <p className="text-sm text-muted-foreground">Oportunidades recomendadas por actividad reciente.</p>
            </div>
            <Link href="/dashboard/leads" className="text-sm font-medium text-primary hover:underline">
              Ver leads
            </Link>
          </div>
          <div className="divide-y">
            {metrics.recentLeads.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No hay leads IA calificados todavia.</p>
            ) : (
              metrics.recentLeads.map((lead) => (
                <article key={lead.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{lead.contactName}</p>
                    <span className={cn("rounded px-2 py-0.5 text-xs", scoreClass(lead.score))}>Score {lead.score}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">{lead.intent}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">{lead.urgency}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{lead.recommendedAction}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-background">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="font-semibold">Inbox reciente</h2>
              <p className="text-sm text-muted-foreground">Conversaciones que mueven ventas.</p>
            </div>
            <Link href="/dashboard/inbox" className="text-sm font-medium text-primary hover:underline">
              Abrir inbox
            </Link>
          </div>
          <div className="divide-y">
            {metrics.recentConversations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No hay conversaciones recientes.</p>
            ) : (
              metrics.recentConversations.map((conversation) => (
                <article key={conversation.id} className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{conversation.contactName}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(conversation.lastMessageAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {conversation.unreadCount > 0 ? (
                        <span className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">{conversation.unreadCount}</span>
                      ) : null}
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">{conversation.channel}</span>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{conversation.lastMessage}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Activity className="h-4 w-4" />
        Los datos se calculan en tiempo real y siempre filtrados por agencia.
      </div>
    </section>
  );
}
