"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AgencyUser {
  id: string;
  email: string;
  role: "super_admin" | "agency_admin" | "agency_user";
  createdAt: string;
}

export default function AgencyUsersRoute() {
  const [users, setUsers] = useState<AgencyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers(): Promise<void> {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/agency/users");
    if (!response.ok) {
      setError("No se pudieron cargar los usuarios");
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as { data: AgencyUser[] };
    setUsers(payload.data);
    setLoading(false);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    const response = await fetch("/api/agency/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        role: String(formData.get("role") ?? "agency_user")
      })
    });
    setSaving(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "No se pudo crear el usuario");
      return;
    }
    setDialogOpen(false);
    await loadUsers();
  }

  async function updateRole(userId: string, role: "agency_admin" | "agency_user"): Promise<void> {
    const response = await fetch(`/api/agency/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });
    if (!response.ok) {
      setError("No se pudo actualizar el rol");
      return;
    }
    await loadUsers();
  }

  async function deleteUser(userId: string): Promise<void> {
    const response = await fetch(`/api/agency/users/${userId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "No se pudo eliminar el usuario");
      return;
    }
    await loadUsers();
  }

  return (
    <section className="space-y-5 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Gestiona administradores y miembros del equipo.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadUsers()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Nuevo usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear usuario</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Agrega un usuario al workspace y asignale su rol dentro de la agencia.
              </DialogDescription>
            </DialogHeader>
              <form onSubmit={(event) => void createUser(event)} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" name="password" type="password" minLength={8} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <select id="role" name="role" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                    <option value="agency_user">Usuario de agencia</option>
                    <option value="agency_admin">Administrador de agencia</option>
                  </select>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Crear"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Creado</th>
              <th className="w-24 px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Cargando usuarios...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.role === "super_admin" ? (
                      "super_admin"
                    ) : (
                      <select
                        value={user.role}
                        onChange={(event) => void updateRole(user.id, event.target.value as "agency_admin" | "agency_user")}
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                      >
                        <option value="agency_user">Usuario de agencia</option>
                        <option value="agency_admin">Administrador de agencia</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" className="h-8 px-2" onClick={() => void deleteUser(user.id)} aria-label="Eliminar usuario">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
