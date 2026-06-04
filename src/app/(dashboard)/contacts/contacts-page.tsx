"use client";

import { Edit, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
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

  async function loadContacts(): Promise<void> {
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
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadContacts();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search, tag]);

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
    <section className="space-y-5 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contactos</h1>
          <p className="text-sm text-muted-foreground">Busca, segmenta y gestiona contactos de la agencia.</p>
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
              <DialogDescription className="text-sm text-muted-foreground">
                Completa los datos principales para segmentar y dar seguimiento al contacto.
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
                <Label htmlFor="phone">Telefono</Label>
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
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-80 max-w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar contactos" />
        </div>
        <Input className="w-48" value={tag} onChange={(event) => setTag(event.target.value)} placeholder="Filtrar por tag" />
        <Button variant="outline" onClick={() => void loadContacts()} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-[48rem] w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Telefono</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium">Origen</th>
              <th className="w-28 px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Cargando contactos...
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No se encontraron contactos.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="border-t">
                  <td className="px-4 py-3 font-medium">
                    {contact.firstName} {contact.lastName}
                  </td>
                  <td className="px-4 py-3">{contact.email ?? "-"}</td>
                  <td className="px-4 py-3">{contact.phone ?? "-"}</td>
                  <td className="px-4 py-3">{contact.tags.join(", ") || "-"}</td>
                  <td className="px-4 py-3">{contact.source ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" className="h-8 px-2" onClick={() => openEditDialog(contact)} aria-label="Editar contacto">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" className="h-8 px-2" onClick={() => void deleteContact(contact.id)} aria-label="Eliminar contacto">
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
    </section>
  );
}
