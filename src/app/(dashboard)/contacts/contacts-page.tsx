"use client";

import { Edit, Plus, RefreshCw, Search, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ContactRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  source: string | null;
}

interface ContactsResponse {
  data: ContactRow[];
}

interface ContactFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string;
  source: string;
}

const emptyForm: ContactFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  tags: "",
  source: "Manual"
};

function contactToForm(contact: ContactRow): ContactFormState {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    tags: contact.tags.join(", "),
    source: contact.source ?? "Manual"
  };
}

function formToPayload(form: ContactFormState) {
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email || undefined,
    phone: form.phone || undefined,
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    customFields: {},
    source: form.source || undefined
  };
}

function contactName(contact: ContactRow): string {
  return `${contact.firstName} ${contact.lastName}`.trim() || contact.email || contact.phone || "Contacto";
}

function initials(contact: ContactRow): string {
  const name = contactName(contact);
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ContactsPage() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);
  const [form, setForm] = useState<ContactFormState>(emptyForm);

  const loadContacts = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (tag.trim()) {
      params.set("tag", tag.trim());
    }

    try {
      const response = await fetch(`/api/contacts?${params.toString()}`);
      if (!response.ok) {
        throw new Error("No se pudieron cargar los contactos");
      }
      const payload = (await response.json()) as ContactsResponse;
      setContacts(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los contactos");
    } finally {
      setLoading(false);
    }
  }, [search, tag]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadContacts();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [loadContacts]);

  function updateForm(field: keyof ContactFormState, value: string): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateDialog(): void {
    setEditingContact(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(contact: ContactRow): void {
    setEditingContact(contact);
    setForm(contactToForm(contact));
    setDialogOpen(true);
  }

  async function saveContact(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const endpoint = editingContact ? `/api/contacts/${editingContact.id}` : "/api/contacts";
    const method = editingContact ? "PATCH" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(form))
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "No se pudo guardar el contacto");
      }
      setDialogOpen(false);
      await loadContacts();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el contacto");
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact(contactId: string): Promise<void> {
    setError(null);
    const response = await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
    if (!response.ok) {
      setError("No se pudo eliminar el contacto");
      return;
    }
    await loadContacts();
  }

  return (
    <section className="flex min-h-[calc(100vh-64px)] flex-col gap-stack-lg p-container-padding">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label-sm uppercase text-primary">CRM</p>
          <h1 className="text-display-lg text-on-background">Contactos</h1>
          <p className="text-body-md text-secondary">Gestiona clientes, leads y partners de la agencia.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Nuevo contacto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingContact ? "Editar contacto" : "Crear contacto"}</DialogTitle>
              <DialogDescription className="text-body-sm text-secondary">
                Completá los datos principales para segmentar y dar seguimiento al contacto.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(event) => void saveContact(event)} className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input id="firstName" value={form.firstName} onChange={(event) => updateForm("firstName", event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input id="lastName" value={form.lastName} onChange={(event) => updateForm("lastName", event.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" value={form.tags} onChange={(event) => updateForm("tags", event.target.value)} placeholder="lead, vip" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Origen</Label>
                <Input id="source" value={form.source} onChange={(event) => updateForm("source", event.target.value)} />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar contacto"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-80 max-w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o email" />
        </div>
        <Input className="w-48" value={tag} onChange={(event) => setTag(event.target.value)} placeholder="Filtrar por tag" />
        <Button variant="outline" onClick={() => void loadContacts()} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-body-sm text-red-700">{error}</div> : null}

      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-4 py-3">
          <div className="flex items-center gap-2 text-label-md text-secondary">
            <Users className="h-4 w-4" />
            {contacts.length} contactos
          </div>
          <p className="text-label-sm uppercase text-secondary">Tabla CRM</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface">
                <th className="px-4 py-3 text-label-sm uppercase text-secondary">Nombre</th>
                <th className="px-4 py-3 text-label-sm uppercase text-secondary">Email</th>
                <th className="px-4 py-3 text-label-sm uppercase text-secondary">Teléfono</th>
                <th className="px-4 py-3 text-label-sm uppercase text-secondary">Tags</th>
                <th className="px-4 py-3 text-label-sm uppercase text-secondary">Origen</th>
                <th className="w-28 px-4 py-3 text-label-sm uppercase text-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-body-sm text-secondary">
                    Cargando contactos...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-body-sm text-secondary">
                    No se encontraron contactos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="group hover:bg-surface-container-low">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-label-md font-semibold text-primary">
                          {initials(contact)}
                        </div>
                        <div>
                          <p className="text-body-sm font-semibold text-on-surface">{contactName(contact)}</p>
                          <p className="text-label-sm text-secondary">{contact.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-body-sm text-on-surface">{contact.email ?? "-"}</td>
                    <td className="px-4 py-3 text-body-sm text-secondary">{contact.phone ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.length === 0 ? (
                          <span className="text-body-sm text-secondary">-</span>
                        ) : (
                          contact.tags.slice(0, 3).map((item) => (
                            <span key={item} className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-secondary">
                              {item}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-body-sm text-secondary">{contact.source ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                        <Button variant="ghost" className="h-8 w-8 px-0" onClick={() => openEditDialog(contact)} aria-label="Editar contacto">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" className="h-8 w-8 px-0 text-destructive hover:text-destructive" onClick={() => void deleteContact(contact.id)} aria-label="Eliminar contacto">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
