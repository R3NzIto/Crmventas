"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function RegisterForm() {
  const router = useRouter();
  const [agencyName, setAgencyName] = useState("");
  const [agencySlug, setAgencySlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateAgencyName(value: string): void {
    setAgencyName(value);
    setAgencySlug((current) => current || slugify(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agencyName,
        agencySlug,
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? "")
      })
    });
    setSaving(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "No se pudo registrar la agencia");
      return;
    }

    router.push("/login");
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="w-full max-w-md space-y-4 rounded-lg border bg-background p-6 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold">Crear agencia</h1>
        <p className="text-sm text-muted-foreground">Inicia un nuevo workspace multi-tenant.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="agencyName">Nombre de la agencia</Label>
          <Input id="agencyName" value={agencyName} onChange={(event) => updateAgencyName(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agencySlug">Slug</Label>
          <Input id="agencySlug" value={agencySlug} onChange={(event) => setAgencySlug(slugify(event.target.value))} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Tu nombre</Label>
        <Input id="name" name="name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contrasena</Label>
        <Input id="password" name="password" type="password" minLength={8} required />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Creando..." : "Crear agencia"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Ya tenes una cuenta?{" "}
        <Link className="font-medium text-foreground hover:underline" href="/login">
          Ingresar
        </Link>
      </p>
    </form>
  );
}
