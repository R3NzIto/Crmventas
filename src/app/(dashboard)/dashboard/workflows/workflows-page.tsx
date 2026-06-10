"use client";

import { Plus, RefreshCw, Trash2, Workflow as WorkflowIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TriggerType = "contact_created" | "tag_added" | "stage_changed" | "form_submitted" | "message_received" | "lead_qualified";
type ActionType = "send_email" | "add_tag" | "move_pipeline_stage" | "wait_delay" | "create_task" | "send_message";

interface WorkflowTrigger {
  type: TriggerType;
  tag?: string;
  stageId?: string;
  formId?: string;
  channel?: "email" | "sms" | "whatsapp";
  keyword?: string;
  minScore?: number;
  intent?: string;
  urgency?: string;
}

interface WorkflowStep {
  type: ActionType;
  tag?: string;
  stageId?: string;
  delayMs?: number;
  subject?: string;
  body?: string;
  title?: string;
  message?: string;
}

interface WorkflowExecution {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  log: WorkflowExecutionLogEntry[];
  startedAt: string;
  contact: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
}

interface WorkflowExecutionLogEntry {
  step?: string;
  status?: string;
  at?: string;
  label?: string;
  detail?: string;
}

interface WorkflowRecord {
  id: string;
  name: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  isActive: boolean;
  executions: WorkflowExecution[];
}

interface WorkflowFormState {
  name: string;
  triggerType: TriggerType;
  triggerTag: string;
  triggerStageId: string;
  triggerFormId: string;
  triggerChannel: "email" | "sms" | "whatsapp";
  triggerKeyword: string;
  triggerMinScore: string;
  triggerIntent: string;
  triggerUrgency: string;
  actionType: ActionType;
  actionTag: string;
  actionStageId: string;
  actionDelaySeconds: string;
  actionSubject: string;
  actionBody: string;
  actionTitle: string;
  actionMessage: string;
  isActive: boolean;
}

const defaultForm: WorkflowFormState = {
  name: "",
  triggerType: "contact_created",
  triggerTag: "",
  triggerStageId: "",
  triggerFormId: "",
  triggerChannel: "email",
  triggerKeyword: "",
  triggerMinScore: "70",
  triggerIntent: "",
  triggerUrgency: "",
  actionType: "add_tag",
  actionTag: "new-lead",
  actionStageId: "",
  actionDelaySeconds: "60",
  actionSubject: "",
  actionBody: "",
  actionTitle: "",
  actionMessage: "",
  isActive: true
};

function executionContactName(execution: WorkflowExecution): string {
  return `${execution.contact.firstName} ${execution.contact.lastName}`.trim() || execution.contact.email || "Contacto desconocido";
}

function buildTrigger(form: WorkflowFormState): WorkflowTrigger {
  return {
    type: form.triggerType,
    ...(form.triggerTag ? { tag: form.triggerTag } : {}),
    ...(form.triggerStageId ? { stageId: form.triggerStageId } : {}),
    ...(form.triggerFormId ? { formId: form.triggerFormId } : {}),
    ...(form.triggerType === "message_received" ? { channel: form.triggerChannel } : {}),
    ...(form.triggerType === "lead_qualified" ? { minScore: Number(form.triggerMinScore || 70) } : {}),
    ...(form.triggerKeyword ? { keyword: form.triggerKeyword } : {}),
    ...(form.triggerIntent ? { intent: form.triggerIntent } : {}),
    ...(form.triggerUrgency ? { urgency: form.triggerUrgency } : {})
  };
}

function buildStep(form: WorkflowFormState): WorkflowStep {
  return {
    type: form.actionType,
    ...(form.actionTag ? { tag: form.actionTag } : {}),
    ...(form.actionStageId ? { stageId: form.actionStageId } : {}),
    ...(form.actionDelaySeconds ? { delayMs: Number(form.actionDelaySeconds) * 1000 } : {}),
    ...(form.actionSubject ? { subject: form.actionSubject } : {}),
    ...(form.actionBody ? { body: form.actionBody } : {}),
    ...(form.actionTitle ? { title: form.actionTitle } : {}),
    ...(form.actionMessage ? { message: form.actionMessage } : {})
  };
}

function workflowToForm(workflow: WorkflowRecord): WorkflowFormState {
  const firstStep = workflow.steps[0];
  return {
    ...defaultForm,
    name: workflow.name,
    triggerType: workflow.trigger.type,
    triggerTag: workflow.trigger.tag ?? "",
    triggerStageId: workflow.trigger.stageId ?? "",
    triggerFormId: workflow.trigger.formId ?? "",
    triggerChannel: workflow.trigger.channel ?? "email",
    triggerKeyword: workflow.trigger.keyword ?? "",
    triggerMinScore: workflow.trigger.minScore ? String(workflow.trigger.minScore) : "70",
    triggerIntent: workflow.trigger.intent ?? "",
    triggerUrgency: workflow.trigger.urgency ?? "",
    actionType: firstStep?.type ?? "add_tag",
    actionTag: firstStep?.tag ?? "",
    actionStageId: firstStep?.stageId ?? "",
    actionDelaySeconds: firstStep?.delayMs ? String(Math.round(firstStep.delayMs / 1000)) : "60",
    actionSubject: firstStep?.subject ?? "",
    actionBody: firstStep?.body ?? "",
    actionTitle: firstStep?.title ?? "",
    actionMessage: firstStep?.message ?? "",
    isActive: workflow.isActive
  };
}

function describeTrigger(trigger: WorkflowTrigger): string {
  if (trigger.type === "message_received") {
    return `mensaje recibido ${trigger.channel ?? "cualquier canal"}${trigger.keyword ? ` con "${trigger.keyword}"` : ""}`;
  }
  if (trigger.type === "lead_qualified") {
    return `lead calificado con puntaje >= ${trigger.minScore ?? 70}${trigger.intent ? ` e interes ${trigger.intent}` : ""}`;
  }
  if (trigger.type === "tag_added" && trigger.tag) {
    return `tag agregado ${trigger.tag}`;
  }
  if (trigger.type === "contact_created") {
    return "contacto creado";
  }
  if (trigger.type === "stage_changed") {
    return "etapa cambiada";
  }
  if (trigger.type === "form_submitted") {
    return "formulario enviado";
  }
  return trigger.type;
}

function describeStep(step: WorkflowStep): string {
  if (step.type === "add_tag") {
    return `agregar tag ${step.tag ?? ""}`;
  }
  if (step.type === "wait_delay") {
    return `esperar ${step.delayMs ? Math.round(step.delayMs / 1000) : 0}s`;
  }
  if (step.type === "send_message") {
    return `enviar mensaje ${step.message ?? ""}`;
  }
  if (step.type === "send_email") {
    return `enviar email ${step.subject ?? ""}`;
  }
  if (step.type === "move_pipeline_stage") {
    return `mover a etapa ${step.stageId ?? ""}`;
  }
  if (step.type === "create_task") {
    return `crear tarea ${step.title ?? ""}`;
  }
  return step.type;
}

function executionStatusLabel(status: WorkflowExecution["status"]): string {
  const labels: Record<WorkflowExecution["status"], string> = {
    pending: "Pendiente",
    running: "Ejecutando",
    completed: "Completada",
    failed: "Fallida"
  };
  return labels[status];
}

function executionStatusClass(status: WorkflowExecution["status"]): string {
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "failed") {
    return "bg-red-100 text-red-700";
  }
  if (status === "running") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-600";
}

function logEntryLabel(entry: WorkflowExecutionLogEntry): string {
  if (entry.label) {
    return entry.label;
  }
  if (entry.step === "add_tag") {
    return "Agregar tag";
  }
  if (entry.step === "move_pipeline_stage") {
    return "Mover oportunidad de etapa";
  }
  if (entry.step === "wait_delay") {
    return "Esperar";
  }
  if (entry.step === "send_message") {
    return "Enviar mensaje";
  }
  if (entry.step === "send_email") {
    return "Enviar email";
  }
  if (entry.step === "create_task") {
    return "Crear tarea";
  }
  if (entry.step === "error") {
    return "Error al ejecutar automatización";
  }
  return entry.step ?? "Paso ejecutado";
}

function logStatusLabel(status?: string): string {
  if (status === "completed") {
    return "Completado";
  }
  if (status === "failed") {
    return "Fallido";
  }
  return status ?? "Registrado";
}

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkflowFormState>(defaultForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedWorkflow = useMemo(() => workflows.find((workflow) => workflow.id === selectedId) ?? workflows[0], [workflows, selectedId]);

  const loadWorkflows = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/workflows");
    if (!response.ok) {
      setError("No se pudieron cargar las automatizaciones");
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as { data: WorkflowRecord[] };
    setWorkflows(payload.data);
    if (!selectedId && payload.data[0]) {
      setSelectedId(payload.data[0].id);
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    void loadWorkflows();
  }, [loadWorkflows]);

  function updateForm<K extends keyof WorkflowFormState>(key: K, value: WorkflowFormState[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreateDialog(): void {
    setSelectedId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEditDialog(workflow: WorkflowRecord): void {
    setSelectedId(workflow.id);
    setForm(workflowToForm(workflow));
    setDialogOpen(true);
  }

  async function saveWorkflow(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const editing = selectedId && workflows.some((workflow) => workflow.id === selectedId);
    const response = await fetch(editing ? `/api/workflows/${selectedId}` : "/api/workflows", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        trigger: buildTrigger(form),
        steps: [buildStep(form)],
        isActive: form.isActive
      })
    });
    setSaving(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "No se pudo guardar la automatización");
      return;
    }
    setDialogOpen(false);
    await loadWorkflows();
  }

  async function toggleWorkflow(workflow: WorkflowRecord): Promise<void> {
    const response = await fetch(`/api/workflows/${workflow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !workflow.isActive })
    });
    if (!response.ok) {
      setError("No se pudo actualizar la automatización");
      return;
    }
    await loadWorkflows();
  }

  async function deleteWorkflow(id: string): Promise<void> {
    const response = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("No se pudo eliminar la automatización");
      return;
    }
    setSelectedId(null);
    await loadWorkflows();
  }

  return (
    <section className="grid h-[calc(100vh-64px)] overflow-hidden md:grid-cols-[22rem_1fr]">
      <aside className="border-b border-outline-variant bg-surface-container-lowest md:border-b-0 md:border-r">
        <div className="space-y-3 border-b border-outline-variant bg-surface-bright p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-headline-sm text-on-surface">Automatizaciones</h1>
              <p className="text-body-sm text-secondary">Automatiza eventos de CRM, pipelines, inbox y formularios.</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4" />
                  Nueva
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedId ? "Editar automatización" : "Crear automatización"}</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Configurá el disparador, la acción principal y el estado de la automatización.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(event) => void saveWorkflow(event)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="workflowName">Nombre</Label>
                    <Input id="workflowName" value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
                  </div>

                  <div className="rounded-lg border p-3">
                    <h2 className="mb-3 text-sm font-semibold">Disparador</h2>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="triggerType">Tipo</Label>
                        <select
                          id="triggerType"
                          value={form.triggerType}
                          onChange={(event) => updateForm("triggerType", event.target.value as TriggerType)}
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="contact_created">Contacto creado</option>
                          <option value="tag_added">Tag agregado</option>
                          <option value="stage_changed">Etapa cambiada</option>
                          <option value="form_submitted">Formulario enviado</option>
                          <option value="message_received">Mensaje recibido</option>
                          <option value="lead_qualified">Lead calificado</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="triggerTag">Tag</Label>
                        <Input id="triggerTag" value={form.triggerTag} onChange={(event) => updateForm("triggerTag", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="triggerStageId">ID de etapa</Label>
                        <Input id="triggerStageId" value={form.triggerStageId} onChange={(event) => updateForm("triggerStageId", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="triggerFormId">Form ID</Label>
                        <Input id="triggerFormId" value={form.triggerFormId} onChange={(event) => updateForm("triggerFormId", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="triggerChannel">Canal</Label>
                        <select
                          id="triggerChannel"
                          value={form.triggerChannel}
                          onChange={(event) => updateForm("triggerChannel", event.target.value as "email" | "sms" | "whatsapp")}
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="email">Email</option>
                          <option value="sms">SMS</option>
                          <option value="whatsapp">WhatsApp</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="triggerKeyword">Palabra clave</Label>
                        <Input id="triggerKeyword" value={form.triggerKeyword} onChange={(event) => updateForm("triggerKeyword", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="triggerMinScore">Puntaje minimo de lead</Label>
                        <Input
                          id="triggerMinScore"
                          value={form.triggerMinScore}
                          onChange={(event) => updateForm("triggerMinScore", event.target.value)}
                          type="number"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="triggerIntent">Interes del lead</Label>
                        <select
                          id="triggerIntent"
                          value={form.triggerIntent}
                          onChange={(event) => updateForm("triggerIntent", event.target.value)}
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="">Cualquiera</option>
                          <option value="pricing">Precio</option>
                          <option value="demo">Demo</option>
                          <option value="buying_interest">Interes de compra</option>
                          <option value="follow_up">Seguimiento</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="triggerUrgency">Urgencia del lead</Label>
                        <select
                          id="triggerUrgency"
                          value={form.triggerUrgency}
                          onChange={(event) => updateForm("triggerUrgency", event.target.value)}
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="">Cualquiera</option>
                          <option value="high">Alta</option>
                          <option value="medium">Media</option>
                          <option value="low">Baja</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <h2 className="mb-3 text-sm font-semibold">Acción</h2>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="actionType">Tipo</Label>
                        <select
                          id="actionType"
                          value={form.actionType}
                          onChange={(event) => updateForm("actionType", event.target.value as ActionType)}
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="send_email">Enviar email</option>
                          <option value="send_message">Enviar mensaje</option>
                          <option value="add_tag">Agregar tag</option>
                          <option value="move_pipeline_stage">Mover etapa del pipeline</option>
                          <option value="wait_delay">Esperar</option>
                          <option value="create_task">Crear tarea</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="actionTag">Tag</Label>
                        <Input id="actionTag" value={form.actionTag} onChange={(event) => updateForm("actionTag", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="actionStageId">ID de etapa</Label>
                        <Input id="actionStageId" value={form.actionStageId} onChange={(event) => updateForm("actionStageId", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="actionDelaySeconds">Segundos de espera</Label>
                        <Input
                          id="actionDelaySeconds"
                          value={form.actionDelaySeconds}
                          onChange={(event) => updateForm("actionDelaySeconds", event.target.value)}
                          type="number"
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="actionSubject">Asunto</Label>
                        <Input id="actionSubject" value={form.actionSubject} onChange={(event) => updateForm("actionSubject", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="actionTitle">Título de tarea</Label>
                        <Input id="actionTitle" value={form.actionTitle} onChange={(event) => updateForm("actionTitle", event.target.value)} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="actionMessage">Mensaje / cuerpo</Label>
                        <Input id="actionMessage" value={form.actionMessage} onChange={(event) => updateForm("actionMessage", event.target.value)} />
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.isActive} onChange={(event) => updateForm("isActive", event.target.checked)} />
                    Activa
                  </label>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Guardando..." : "Guardar automatización"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Button variant="outline" onClick={() => void loadWorkflows()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
        {error ? <div className="m-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-body-sm text-red-700">{error}</div> : null}
        <div className="max-h-[28rem] overflow-y-auto md:h-[calc(100vh-12rem)] md:max-h-none">
          {loading ? (
            <p className="p-4 text-body-sm text-secondary">Cargando automatizaciones...</p>
          ) : workflows.length === 0 ? (
            <p className="p-4 text-body-sm text-secondary">Todavía no hay automatizaciones.</p>
          ) : (
            workflows.map((workflow) => (
              <button
                key={workflow.id}
                type="button"
                onClick={() => setSelectedId(workflow.id)}
                className={`w-full border-b border-outline-variant p-4 text-left hover:bg-surface-container-low ${selectedWorkflow?.id === workflow.id ? "bg-surface-container-low" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{workflow.name}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{describeTrigger(workflow.trigger)}</p>
                  </div>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${workflow.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {workflow.isActive ? "Activa" : "Inactiva"}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="min-w-0 overflow-y-auto bg-background p-container-padding">
        {selectedWorkflow ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-display-md text-on-background">{selectedWorkflow.name}</h2>
                <p className="text-body-sm text-secondary">{describeTrigger(selectedWorkflow.trigger)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void toggleWorkflow(selectedWorkflow)}>
                  {selectedWorkflow.isActive ? "Desactivar" : "Activar"}
                </Button>
                <Button variant="outline" onClick={() => openEditDialog(selectedWorkflow)}>
                  Editar
                </Button>
                <Button variant="ghost" onClick={() => void deleteWorkflow(selectedWorkflow.id)} aria-label="Eliminar automatización">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <WorkflowIcon className="h-4 w-4" />
                  Disparador
                </h3>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(selectedWorkflow.trigger, null, 2)}</pre>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="mb-3 font-semibold">Acciones</h3>
                <div className="space-y-2">
                  {selectedWorkflow.steps.map((step, index) => (
                    <div key={`${step.type}-${index}`} className="rounded-md border bg-muted/30 p-3 text-sm">
                      {index + 1}. {describeStep(step)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border">
              <div className="border-b p-4">
                <h3 className="font-semibold">Ejecuciones recientes</h3>
              </div>
              {selectedWorkflow.executions.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Todavía no hay ejecuciones.</p>
              ) : (
                <div className="divide-y">
                  {selectedWorkflow.executions.map((execution) => (
                    <div key={execution.id} className="grid gap-4 p-4 text-sm md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{executionContactName(execution)}</p>
                          <span className={`rounded px-2 py-0.5 text-xs ${executionStatusClass(execution.status)}`}>
                            {executionStatusLabel(execution.status)}
                          </span>
                          <span className="rounded bg-muted px-2 py-0.5 text-xs">
                            {execution.log.length} {execution.log.length === 1 ? "paso" : "pasos"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(execution.startedAt).toLocaleString("es-AR")}</p>
                        {execution.log.length === 0 ? (
                          <p className="mt-3 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                            La ejecucion fue creada y esta esperando al worker.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {execution.log.map((entry, index) => (
                              <div key={`${execution.id}-${entry.step ?? "step"}-${index}`} className="rounded-md border bg-muted/30 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="font-medium">{logEntryLabel(entry)}</p>
                                  <span className="rounded bg-background px-2 py-0.5 text-xs">{logStatusLabel(entry.status)}</span>
                                </div>
                                {entry.detail ? <p className="mt-1 text-xs text-muted-foreground">{entry.detail}</p> : null}
                                {entry.at ? <p className="mt-1 text-xs text-muted-foreground">{new Date(entry.at).toLocaleString("es-AR")}</p> : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`h-fit rounded px-2 py-1 text-xs ${executionStatusClass(execution.status)}`}>{executionStatusLabel(execution.status)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Creá una automatización para empezar.</div>
        )}
      </main>
    </section>
  );
}
