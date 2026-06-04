"use client";

import { Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AgencyProfile {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string | null;
  plan: string;
}

export default function AgencyProfileRoute() {
  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadProfile(): Promise<void> {
    const response = await fetch("/api/agency");
    if (!response.ok) {
      setStatus("No se pudo cargar el perfil de la agencia");
      return;
    }
    const payload = (await response.json()) as { data: AgencyProfile };
    setProfile(payload.data);
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    const response = await fetch("/api/agency", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        logo: String(formData.get("logo") ?? ""),
        primaryColor: String(formData.get("primaryColor") ?? ""),
        plan: String(formData.get("plan") ?? "")
      })
    });
    setSaving(false);
    setStatus(response.ok ? "Guardado" : "No se pudo guardar el perfil de la agencia");
    if (response.ok) {
      await loadProfile();
    }
  }

  return (
    <section className="max-w-3xl space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Perfil de agencia</h1>
        <p className="text-sm text-muted-foreground">Actualiza la identidad del tenant y la marca del dashboard.</p>
      </div>
      <form onSubmit={(event) => void saveProfile(event)} className="space-y-4 rounded-lg border p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la agencia</Label>
            <Input id="name" name="name" defaultValue={profile?.name ?? ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" defaultValue={profile?.slug ?? ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo">Logo URL</Label>
            <Input id="logo" name="logo" defaultValue={profile?.logo ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Color principal</Label>
            <Input id="primaryColor" name="primaryColor" defaultValue={profile?.primaryColor ?? "#2563eb"} placeholder="#2563eb" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan">Plan</Label>
            <Input id="plan" name="plan" defaultValue={profile?.plan ?? "trial"} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
          <span className="text-sm text-muted-foreground">{status}</span>
        </div>
      </form>
    </section>
  );
}
