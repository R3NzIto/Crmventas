"use client";

import { Copy, Edit, ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormFieldType = "text" | "email" | "phone" | "textarea" | "select" | "checkbox";

interface DemoFormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
}

interface DemoWorkflow {
  id: string;
  name: string;
}

interface DemoSubmission {
  id: string;
  data: Record<string, unknown>;
  submittedAt: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
}

interface DemoForm {
  id: string;
  name: string;
  fields: DemoFormField[];
  workflowId: string | null;
  workflow: DemoWorkflow | null;
  submissions: DemoSubmission[];
}

interface WorkflowRecord {
  id: string;
  name: string;
}

interface AgencyProfile {
  slug: string;
}

interface FormEditorField extends DemoFormField {
  optionsText: string;
}

interface FormEditorState {
  name: string;
  workflowId: string;
  fields: FormEditorField[];
}

const emptyEditor: FormEditorState = {
  name: "",
  workflowId: "",
  fields: [
    { id: "firstName", label: "Nombre", type: "text", required: true, options: [], optionsText: "" },
    { id: "email", label: "Email", type: "email", required: true, options: [], optionsText: "" }
  ]
};

function contactName(submission: DemoSubmission): string {
  const name = `${submission.contact.firstName} ${submission.contact.lastName}`.trim();
  return name || submission.contact.email || submission.contact.phone || "Contacto desconocido";
}

function formToEditor(form: DemoForm): FormEditorState {
  return {
    name: form.name,
    workflowId: form.workflowId ?? "",
    fields: form.fields.map((field) => ({ ...field, optionsText: field.options.join(", ") }))
  };
}

function editorToPayload(editor: FormEditorState) {
  return {
    name: editor.name,
    workflowId: editor.workflowId || null,
    fields: editor.fields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      options: field.optionsText
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean)
    }))
  };
}

function newField(): FormEditorField {
  const id = `field-${crypto.randomUUID().slice(0, 8)}`;
  return {
    id,
    label: "Nuevo campo",
    type: "text",
    required: false,
    options: [],
    optionsText: ""
  };
}

export default function DashboardFormsRoute() {
  const [forms, setForms] = useState<DemoForm[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [agencySlug, setAgencySlug] = useState("demo-agency");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<FormEditorState>(emptyEditor);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedForm = useMemo(() => forms.find((form) => form.id === selectedId) ?? forms[0], [forms, selectedId]);

  function publicUrl(form: DemoForm): string {
    const origin = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
    return `${origin}/f/${agencySlug}/${form.id}`;
  }

  const loadForms = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [formsResponse, workflowsResponse, agencyResponse] = await Promise.all([fetch("/api/forms"), fetch("/api/workflows"), fetch("/api/agency")]);
      if (!formsResponse.ok || !workflowsResponse.ok || !agencyResponse.ok) {
        throw new Error("No se pudieron cargar los formularios");
      }
      const formsPayload = (await formsResponse.json()) as { data: DemoForm[] };
      const workflowsPayload = (await workflowsResponse.json()) as { data: WorkflowRecord[] };
      const agencyPayload = (await agencyResponse.json()) as { data: AgencyProfile };
      setForms(formsPayload.data);
      setWorkflows(workflowsPayload.data);
      setAgencySlug(agencyPayload.data.slug);
      if (!selectedId && formsPayload.data[0]) {
        setSelectedId(formsPayload.data[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los formularios");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  function openCreateDialog(): void {
    setSelectedId(null);
    setEditor(emptyEditor);
    setDialogOpen(true);
  }

  function openEditDialog(form: DemoForm): void {
    setSelectedId(form.id);
    setEditor(formToEditor(form));
    setDialogOpen(true);
  }

  function updateEditor<K extends keyof FormEditorState>(key: K, value: FormEditorState[K]): void {
    setEditor((current) => ({ ...current, [key]: value }));
  }

  function updateField(index: number, field: FormEditorField): void {
    setEditor((current) => ({
      ...current,
      fields: current.fields.map((item, itemIndex) => (itemIndex === index ? field : item))
    }));
  }

  async function saveForm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const editing = selectedId && forms.some((form) => form.id === selectedId);
    const response = await fetch(editing ? `/api/forms/${selectedId}` : "/api/forms", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editorToPayload(editor))
    });
    setSaving(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "No se pudo guardar el formulario");
      return;
    }
    setDialogOpen(false);
    await loadForms();
  }

  async function deleteForm(id: string): Promise<void> {
    const response = await fetch(`/api/forms/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("No se pudo eliminar el formulario");
      return;
    }
    setSelectedId(null);
    await loadForms();
  }

  async function copyPublicUrl(form: DemoForm): Promise<void> {
    await navigator.clipboard.writeText(publicUrl(form));
  }

  return (
    <section className="grid h-[calc(100vh-64px)] overflow-hidden md:grid-cols-[22rem_1fr]">
      <aside className="border-b border-outline-variant bg-surface-container-lowest md:border-b-0 md:border-r">
        <div className="space-y-3 border-b border-outline-variant bg-surface-bright p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-headline-sm text-on-surface">Formularios</h1>
              <p className="text-body-sm text-secondary">Captura leads y dispara automatizaciones.</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4" />
                  Nuevo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedId ? "Editar formulario" : "Crear formulario"}</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Define los campos que completara el lead y la automatizacion asociada.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(event) => void saveForm(event)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="formName">Nombre</Label>
                    <Input id="formName" value={editor.name} onChange={(event) => updateEditor("name", event.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workflowId">Automatizacion</Label>
                    <select
                      id="workflowId"
                      value={editor.workflowId}
                      onChange={(event) => updateEditor("workflowId", event.target.value)}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">Sin automatizacion</option>
                      {workflows.map((workflow) => (
                        <option key={workflow.id} value={workflow.id}>
                          {workflow.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold">Campos</h2>
                      <Button type="button" variant="outline" onClick={() => updateEditor("fields", [...editor.fields, newField()])}>
                        <Plus className="h-4 w-4" />
                        Campo
                      </Button>
                    </div>
                    {editor.fields.map((field, index) => (
                      <div key={`${field.id}-${index}`} className="space-y-3 rounded-md border p-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`fieldId-${index}`}>ID</Label>
                            <Input id={`fieldId-${index}`} value={field.id} onChange={(event) => updateField(index, { ...field, id: event.target.value })} required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`fieldLabel-${index}`}>Etiqueta</Label>
                            <Input
                              id={`fieldLabel-${index}`}
                              value={field.label}
                              onChange={(event) => updateField(index, { ...field, label: event.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`fieldType-${index}`}>Tipo</Label>
                            <select
                              id={`fieldType-${index}`}
                              value={field.type}
                              onChange={(event) => updateField(index, { ...field, type: event.target.value as FormFieldType })}
                              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                            >
                              <option value="text">Texto</option>
                              <option value="email">Email</option>
                              <option value="phone">Teléfono</option>
                              <option value="textarea">Textarea</option>
                              <option value="select">Select</option>
                              <option value="checkbox">Checkbox</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`fieldOptions-${index}`}>Opciones</Label>
                            <Input
                              id={`fieldOptions-${index}`}
                              value={field.optionsText}
                              onChange={(event) => updateField(index, { ...field, optionsText: event.target.value })}
                              placeholder="Basic, Pro, Enterprise"
                              disabled={field.type !== "select"}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(event) => updateField(index, { ...field, required: event.target.checked })}
                            />
                            Obligatorio
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => updateEditor("fields", editor.fields.filter((_, itemIndex) => itemIndex !== index))}
                            aria-label="Quitar campo"
                            disabled={editor.fields.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Guardando..." : "Guardar formulario"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Button variant="outline" onClick={() => void loadForms()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
        {error ? <div className="m-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-body-sm text-red-700">{error}</div> : null}
        <div className="max-h-[28rem] overflow-y-auto md:h-[calc(100vh-12rem)] md:max-h-none">
          {loading ? (
            <p className="p-4 text-body-sm text-secondary">Cargando formularios...</p>
          ) : forms.length === 0 ? (
            <p className="p-4 text-body-sm text-secondary">Todavía no hay formularios.</p>
          ) : (
            forms.map((form) => (
              <button
                key={form.id}
                type="button"
                onClick={() => setSelectedId(form.id)}
                className={`w-full border-b border-outline-variant p-4 text-left hover:bg-surface-container-low ${selectedForm?.id === form.id ? "bg-surface-container-low" : ""}`}
              >
                <p className="truncate text-body-sm font-semibold text-on-surface">{form.name}</p>
                <p className="mt-1 text-label-sm text-secondary">
                  {form.fields.length} campos - {form.submissions.length} envíos recientes
                </p>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="min-w-0 overflow-y-auto bg-background p-container-padding">
        {selectedForm ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-display-md text-on-background">{selectedForm.name}</h2>
                <p className="text-body-sm text-secondary">{selectedForm.workflow?.name ?? "Sin automatizacion asociada"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void copyPublicUrl(selectedForm)}>
                  <Copy className="h-4 w-4" />
                  Copiar URL
                </Button>
                <Button variant="outline" asChild>
                  <a href={publicUrl(selectedForm)} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Abrir formulario
                  </a>
                </Button>
                <Button variant="outline" onClick={() => openEditDialog(selectedForm)}>
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                <Button variant="ghost" onClick={() => void deleteForm(selectedForm.id)} aria-label="Eliminar formulario">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg border">
              <div className="border-b p-4">
                <h3 className="font-semibold">Campos</h3>
              </div>
              <div className="divide-y">
                {selectedForm.fields.map((field) => (
                  <div key={field.id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_auto_auto]">
                    <div>
                      <p className="font-medium">{field.label}</p>
                      <p className="text-xs text-muted-foreground">{field.id}</p>
                    </div>
                    <span className="h-fit rounded bg-muted px-2 py-1 text-xs">{field.type}</span>
                    <span className="h-fit rounded bg-muted px-2 py-1 text-xs">{field.required ? "Obligatorio" : "Opcional"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border">
              <div className="border-b p-4">
                <h3 className="font-semibold">Envios recientes</h3>
              </div>
              {selectedForm.submissions.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Todavía no hay envíos.</p>
              ) : (
                <div className="divide-y">
                  {selectedForm.submissions.map((submission) => (
                    <div key={submission.id} className="grid gap-3 p-4 text-sm md:grid-cols-[16rem_1fr]">
                      <div>
                        <p className="font-medium">{contactName(submission)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(submission.submittedAt).toLocaleString()}</p>
                      </div>
                      <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{JSON.stringify(submission.data, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Crea un formulario para empezar a capturar leads.</div>
        )}
      </main>
    </section>
  );
}
