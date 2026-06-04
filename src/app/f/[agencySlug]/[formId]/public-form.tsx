"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormFieldInput } from "@/modules/forms/form.schemas";

interface PublicFormProps {
  agencyName: string;
  agencySlug: string;
  formId: string;
  formName: string;
  fields: FormFieldInput[];
  primaryColor: string | null;
}

function inputType(type: FormFieldInput["type"]): string {
  if (type === "email") {
    return "email";
  }
  if (type === "phone") {
    return "tel";
  }
  return "text";
}

function initialValue(field: FormFieldInput): string | boolean {
  return field.type === "checkbox" ? false : "";
}

function fieldValue(formData: FormData, field: FormFieldInput): unknown {
  if (field.type === "checkbox") {
    return formData.get(field.id) === "on";
  }
  return String(formData.get(field.id) ?? "").trim();
}

export function PublicForm({ agencyName, agencySlug, formId, formName, fields, primaryColor }: PublicFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const defaultValues = useMemo(() => {
    return Object.fromEntries(fields.map((field) => [field.id, initialValue(field)]));
  }, [fields]);

  async function submitForm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(fields.map((field) => [field.id, fieldValue(formData, field)]));

    const response = await fetch(`/api/public/forms/${agencySlug}/${formId}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "No se pudo enviar el formulario");
      setStatus("error");
      return;
    }

    setStatus("sent");
    setResetKey((current) => current + 1);
  }

  if (status === "sent") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-lg border bg-background p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-semibold">Formulario enviado</h1>
          <p className="mt-2 text-sm text-muted-foreground">Gracias. El equipo de {agencyName} recibio tu consulta.</p>
          <Button className="mt-6" onClick={() => setStatus("idle")}>
            Enviar otra respuesta
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-muted-foreground">{agencyName}</p>
        <h1 className="mt-2 text-3xl font-semibold">{formName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Completa tus datos y te contactaremos a la brevedad.</p>
      </div>

      <form key={resetKey} onSubmit={(event) => void submitForm(event)} className="space-y-5 rounded-lg border bg-background p-6 shadow-sm">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            {field.type === "checkbox" ? (
              <label className="flex items-start gap-2 text-sm">
                <input name={field.id} type="checkbox" required={field.required} defaultChecked={Boolean(defaultValues[field.id])} className="mt-1" />
                <span>
                  {field.label}
                  {field.required ? <span className="text-red-600"> *</span> : null}
                </span>
              </label>
            ) : (
              <>
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required ? <span className="text-red-600"> *</span> : null}
                </Label>
                {field.type === "textarea" ? (
                  <textarea
                    id={field.id}
                    name={field.id}
                    required={field.required}
                    className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                ) : field.type === "select" ? (
                  <select id={field.id} name={field.id} required={field.required} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                    <option value="">Seleccionar</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input id={field.id} name={field.id} required={field.required} type={inputType(field.type)} />
                )}
              </>
            )}
          </div>
        ))}

        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <Button type="submit" disabled={status === "sending"} style={primaryColor ? { backgroundColor: primaryColor } : undefined}>
          <Send className="h-4 w-4" />
          {status === "sending" ? "Enviando..." : "Enviar formulario"}
        </Button>
      </form>
    </section>
  );
}
