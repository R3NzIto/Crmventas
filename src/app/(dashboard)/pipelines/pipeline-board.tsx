"use client";

import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { Edit3, GripVertical, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PipelineContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface PipelineDeal {
  id: string;
  stageId: string;
  contactId: string;
  title: string;
  value: number;
  closeDate: string | null;
  status: "open" | "won" | "lost";
  contact: PipelineContact;
}

interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  color: string | null;
  deals: PipelineDeal[];
}

interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
}

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface PipelinesResponse {
  data: Pipeline[];
}

interface ContactsResponse {
  data: ContactOption[];
}

function contactName(contact: PipelineContact | ContactOption): string {
  return `${contact.firstName} ${contact.lastName}`.trim() || contact.email || "Unnamed contact";
}

function dealOrigin(deal: PipelineDeal): string {
  if (deal.title.startsWith("Lead de formulario:")) {
    return "Formulario";
  }
  if (deal.title.startsWith("Lead IA:")) {
    return "IA";
  }
  return "Manual";
}

function originClass(origin: string): string {
  if (origin === "Formulario") {
    return "bg-blue-100 text-blue-700";
  }
  if (origin === "IA") {
    return "bg-emerald-100 text-emerald-700";
  }
  return "bg-slate-100 text-slate-600";
}

function statusLabel(status: PipelineDeal["status"]): string {
  if (status === "won") {
    return "Ganado";
  }
  if (status === "lost") {
    return "Perdido";
  }
  return "Abierto";
}

function Deal({ deal, onEdit }: { deal: PipelineDeal; onEdit: (deal: PipelineDeal) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const origin = dealOrigin(deal);

  return (
    <div ref={setNodeRef} style={style} className="group relative rounded border border-outline-variant bg-surface-container-lowest p-3 shadow-sm transition-colors hover:bg-surface-container-low">
      <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l bg-surface-container-highest transition-colors group-hover:bg-primary" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 pl-2">
          <p className="line-clamp-2 text-body-sm font-semibold text-on-surface">{deal.title}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className={cn("rounded px-1.5 py-0.5 text-label-sm", originClass(origin))}>{origin}</span>
            <span className="rounded bg-surface-container px-1.5 py-0.5 text-label-sm text-secondary">{statusLabel(deal.status)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onEdit(deal)}
            aria-label={`Editar oportunidad ${deal.title}`}
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Mover oportunidad ${deal.title}`}
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-2 pl-2 text-label-sm text-secondary">{contactName(deal.contact)}</p>
      <p className="mt-3 pl-2 text-body-sm font-semibold text-primary">${deal.value.toLocaleString()}</p>
    </div>
  );
}

function Stage({ stage, onEditDeal }: { stage: PipelineStage; onEditDeal: (deal: PipelineDeal) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div ref={setNodeRef} className={cn("flex min-h-[30rem] flex-col rounded-lg border border-dashed border-outline-variant bg-transparent p-3", isOver && "ring-2 ring-primary")}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color ?? "#64748b" }} />
          <h2 className="text-label-sm uppercase text-secondary">{stage.name}</h2>
        </div>
        <span className="text-label-sm text-secondary">{stage.deals.length}</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {stage.deals.length === 0 ? (
          <div className="flex min-h-[8rem] items-center justify-center rounded border border-dashed border-outline-variant bg-surface-container-lowest p-4 text-center text-body-sm text-secondary">
            Soltá oportunidades aquí
          </div>
        ) : (
          stage.deals.map((deal) => <Deal key={deal.id} deal={deal} onEdit={onEditDeal} />)
        )}
      </div>
    </div>
  );
}

export function PipelineBoard() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<PipelineDeal | null>(null);

  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => pipeline.id === selectedPipelineId) ?? pipelines[0],
    [pipelines, selectedPipelineId]
  );

  const loadPipelines = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [pipelineResponse, contactsResponse] = await Promise.all([fetch("/api/pipelines"), fetch("/api/contacts")]);
      if (!pipelineResponse.ok || !contactsResponse.ok) {
        throw new Error("No se pudieron cargar los pipelines");
      }
      const pipelinePayload = (await pipelineResponse.json()) as PipelinesResponse;
      const contactPayload = (await contactsResponse.json()) as ContactsResponse;
      setPipelines(pipelinePayload.data);
      setContacts(contactPayload.data);
      if (!selectedPipelineId && pipelinePayload.data[0]) {
        setSelectedPipelineId(pipelinePayload.data[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los pipelines");
    } finally {
      setLoading(false);
    }
  }, [selectedPipelineId]);

  useEffect(() => {
    void loadPipelines();
  }, [loadPipelines]);

  function updateDealStageLocally(dealId: string, stageId: string): Pipeline[] {
    return pipelines.map((pipeline) => {
      let movedDeal: PipelineDeal | null = null;
      const stagesWithoutDeal = pipeline.stages.map((stage) => {
        const deal = stage.deals.find((item) => item.id === dealId);
        if (deal) {
          movedDeal = { ...deal, stageId };
        }
        return { ...stage, deals: stage.deals.filter((item) => item.id !== dealId) };
      });
      if (!movedDeal) {
        return pipeline;
      }
      const dealToMove = movedDeal;
      return {
        ...pipeline,
        stages: stagesWithoutDeal.map((stage) => (stage.id === stageId ? { ...stage, deals: [...stage.deals, dealToMove] } : stage))
      };
    });
  }

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    const dealId = String(event.active.id);
    const stageId = event.over?.id ? String(event.over.id) : undefined;
    if (!stageId) {
      return;
    }
    const previousPipelines = pipelines;
    setPipelines(updateDealStageLocally(dealId, stageId));
    setError(null);

    const response = await fetch(`/api/deals/${dealId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId })
    });
    if (!response.ok) {
      setPipelines(previousPipelines);
      setError("No se pudo mover la oportunidad");
    }
  }

  async function createPipeline(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      return;
    }
    setSaving(true);
    const response = await fetch("/api/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        stages: [
          { name: "New", order: 0, color: "#2563eb" },
          { name: "Qualified", order: 1, color: "#10b981" },
          { name: "Proposal", order: 2, color: "#f59e0b" },
          { name: "Won", order: 3, color: "#334155" }
        ]
      })
    });
    setSaving(false);
    if (!response.ok) {
      setError("No se pudo crear el pipeline");
      return;
    }
    setPipelineDialogOpen(false);
    await loadPipelines();
  }

  async function createDeal(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedPipeline) {
      return;
    }
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const contactId = String(formData.get("contactId") ?? "");
    const stageId = String(formData.get("stageId") ?? "");
    const value = Number(formData.get("value") ?? 0);
    if (!title || !contactId || !stageId) {
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/pipelines/${selectedPipeline.id}/deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, contactId, stageId, value, status: "open" })
    });
    setSaving(false);
    if (!response.ok) {
      setError("No se pudo crear la oportunidad");
      return;
    }
    setDealDialogOpen(false);
    await loadPipelines();
  }

  async function updateDeal(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!editingDeal) {
      return;
    }
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const value = Number(formData.get("value") ?? 0);
    const status = String(formData.get("status") ?? "open") as PipelineDeal["status"];
    if (!title || !["open", "won", "lost"].includes(status)) {
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/deals/${editingDeal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, value, status })
    });
    setSaving(false);
    if (!response.ok) {
      setError("No se pudo actualizar la oportunidad");
      return;
    }
    setEditingDeal(null);
    await loadPipelines();
  }

  async function deleteDeal(): Promise<void> {
    if (!editingDeal) {
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/deals/${editingDeal.id}`, { method: "DELETE" });
    setSaving(false);
    if (!response.ok) {
      setError("No se pudo eliminar la oportunidad");
      return;
    }
    setEditingDeal(null);
    await loadPipelines();
  }

  return (
    <section className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-lowest px-container-padding py-stack-md">
        <div>
          <p className="text-label-sm uppercase text-primary">Pipeline de ventas</p>
          <h1 className="text-display-md text-on-background">Pipelines</h1>
          <p className="text-body-sm text-secondary">Mueve oportunidades por etapas comerciales de la agencia.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
          <select
            value={selectedPipeline?.id ?? ""}
            onChange={(event) => setSelectedPipelineId(event.target.value)}
            className="h-9 rounded border border-outline-variant bg-surface-container-lowest px-3 text-body-sm text-on-surface"
          >
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </select>
          <Dialog open={pipelineDialogOpen} onOpenChange={setPipelineDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4" />
                Pipeline
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear pipeline</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Crea un tablero de ventas con etapas para ordenar oportunidades.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(event) => void createPipeline(event)} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="pipelineName">Nombre</Label>
                  <Input id="pipelineName" name="name" required />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Crear"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedPipeline || contacts.length === 0}>
                <Plus className="h-4 w-4" />
                Oportunidad
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear oportunidad</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Seleccioná un contacto, valor y etapa inicial para la oportunidad.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(event) => void createDeal(event)} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="dealTitle">Título</Label>
                  <Input id="dealTitle" name="title" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dealValue">Valor</Label>
                  <Input id="dealValue" name="value" type="number" min="0" defaultValue="0" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dealContact">Contacto</Label>
                  <select id="dealContact" name="contactId" className="h-9 w-full rounded-md border bg-background px-3 text-sm" required>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contactName(contact)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dealStage">Etapa</Label>
                  <select id="dealStage" name="stageId" className="h-9 w-full rounded-md border bg-background px-3 text-sm" required>
                    {selectedPipeline?.stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Crear"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={Boolean(editingDeal)} onOpenChange={(open) => !open && setEditingDeal(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar oportunidad</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Actualiza el valor comercial y el estado de seguimiento.
                </DialogDescription>
              </DialogHeader>
              {editingDeal ? (
                <form onSubmit={(event) => void updateDeal(event)} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="editDealTitle">Título</Label>
                    <Input id="editDealTitle" name="title" defaultValue={editingDeal.title} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editDealValue">Valor</Label>
                    <Input id="editDealValue" name="value" type="number" min="0" defaultValue={editingDeal.value} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editDealStatus">Estado</Label>
                    <select
                      id="editDealStatus"
                      name="status"
                      defaultValue={editingDeal.status}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="open">Abierto</option>
                      <option value="won">Ganado</option>
                      <option value="lost">Perdido</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => void deleteDeal()} disabled={saving}>
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </div>
                </form>
              ) : null}
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => void loadPipelines()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-container-padding">
        {error ? <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-body-sm text-red-700">{error}</div> : null}

        {loading ? (
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center text-body-sm text-secondary">Cargando pipeline...</div>
        ) : !selectedPipeline ? (
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center text-body-sm text-secondary">Crea un pipeline para empezar a gestionar oportunidades.</div>
        ) : selectedPipeline.stages.length === 0 ? (
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center text-body-sm text-secondary">Este pipeline no tiene etapas.</div>
        ) : (
          <DndContext onDragEnd={(event) => void handleDragEnd(event)}>
            <div className="grid min-w-[72rem] gap-stack-md md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {selectedPipeline.stages.map((stage) => (
                <Stage key={stage.id} stage={stage} onEditDeal={setEditingDeal} />
              ))}
            </div>
          </DndContext>
        )}
      </div>
    </section>
  );
}
