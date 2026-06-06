import { ArrowRight, CircleDollarSign, Inbox, Kanban, Sparkles, TrendingUp, Users, Workflow } from "lucide-react";
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
    <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-stack-lg p-container-padding">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-label-sm uppercase text-primary">Visión general</p>
          <h1 className="text-display-lg text-on-background">Resumen comercial</h1>
          <p className="text-body-md text-secondary">Actividad de ventas, leads e inbox del workspace.</p>
        </div>
        <Link
          href="/dashboard/pipelines"
          className="inline-flex h-9 items-center gap-2 rounded border border-outline-variant bg-surface-container-lowest px-3 text-label-md font-semibold text-on-surface hover:bg-surface-container-low"
        >
          <CircleDollarSign className="h-4 w-4" />
          Abrir pipeline
        </Link>
      </div>

      <div className="grid gap-gutter sm:grid-cols-2 xl:grid-cols-4">
        {metrics.cards.map((card) => (
          <article key={card.label} className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-sm transition-colors hover:bg-surface-bright">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-label-sm uppercase text-secondary">{card.label}</p>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </div>
            <p className="text-display-md text-on-surface">{card.value}</p>
            <p className="mt-1 text-body-sm text-secondary">{card.helper}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-stack-lg xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright p-4">
            <div>
              <h2 className="text-label-md uppercase text-secondary">Pipeline activo</h2>
              <p className="text-body-sm text-secondary">Deals abiertos por etapa.</p>
            </div>
            <Link href="/dashboard/pipelines" className="text-label-md font-semibold text-primary hover:underline">
              Ver tablero
            </Link>
          </div>
          <div className="space-y-3 p-4">
            {metrics.pipelineStages.length === 0 ? (
              <p className="rounded bg-surface-container-low p-4 text-body-sm text-secondary">Todavía no hay pipeline configurado.</p>
            ) : (
              metrics.pipelineStages.map((stage) => (
                <div key={stage.id} className="grid gap-3 rounded border border-outline-variant bg-surface p-3 sm:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-on-surface">{stage.name}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-low">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(12, stage.dealCount * 18))}%` }} />
                    </div>
                    <p className="mt-1 text-label-sm text-secondary">{stage.dealCount} oportunidades abiertas</p>
                  </div>
                  <p className="text-body-sm font-semibold text-on-surface">{formatCurrency(stage.value)}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="border-b border-outline-variant bg-surface-bright p-4">
            <h2 className="text-label-md uppercase text-secondary">Accesos rápidos</h2>
            <p className="text-body-sm text-secondary">Entradas directas al flujo diario.</p>
          </div>
          <div className="grid gap-2 p-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href} className="flex items-center justify-between rounded border border-outline-variant bg-surface px-3 py-2 hover:bg-surface-container-low">
                  <span className="inline-flex items-center gap-2 text-body-sm font-semibold text-on-surface">
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-secondary" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-stack-lg xl:grid-cols-2">
        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright p-4">
            <div>
              <h2 className="flex items-center gap-2 text-label-md uppercase text-secondary">
                <Sparkles className="h-4 w-4" />
                Leads IA prioritarios
              </h2>
              <p className="text-body-sm text-secondary">Oportunidades recomendadas por actividad reciente.</p>
            </div>
            <Link href="/dashboard/leads" className="text-label-md font-semibold text-primary hover:underline">
              Ver leads
            </Link>
          </div>
          <div className="divide-y">
            {metrics.recentLeads.length === 0 ? (
              <p className="p-4 text-body-sm text-secondary">No hay leads IA calificados todavía.</p>
            ) : (
              metrics.recentLeads.map((lead) => (
                <article key={lead.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-on-surface">{lead.contactName}</p>
                    <span className={cn("rounded px-2 py-0.5 text-xs", scoreClass(lead.score))}>Score {lead.score}</span>
                    <span className="rounded bg-surface-container px-2 py-0.5 text-label-sm text-secondary">{lead.intent}</span>
                    <span className="rounded bg-surface-container px-2 py-0.5 text-label-sm text-secondary">{lead.urgency}</span>
                  </div>
                  <p className="text-body-sm text-secondary">{lead.recommendedAction}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright p-4">
            <div>
              <h2 className="flex items-center gap-2 text-label-md uppercase text-secondary">
                <Inbox className="h-4 w-4" />
                Inbox reciente
              </h2>
              <p className="text-body-sm text-secondary">Conversaciones que mueven ventas.</p>
            </div>
            <Link href="/dashboard/inbox" className="text-label-md font-semibold text-primary hover:underline">
              Abrir inbox
            </Link>
          </div>
          <div className="divide-y">
            {metrics.recentConversations.length === 0 ? (
              <p className="p-4 text-body-sm text-secondary">No hay conversaciones recientes.</p>
            ) : (
              metrics.recentConversations.map((conversation) => (
                <article key={conversation.id} className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-on-surface">{conversation.contactName}</p>
                      <p className="text-label-sm text-secondary">{formatDate(conversation.lastMessageAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {conversation.unreadCount > 0 ? (
                        <span className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">{conversation.unreadCount}</span>
                      ) : null}
                      <span className="rounded bg-surface-container px-2 py-0.5 text-label-sm text-secondary">{conversation.channel}</span>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-body-sm text-secondary">{conversation.lastMessage}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
