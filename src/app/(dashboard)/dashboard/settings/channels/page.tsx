"use client";

import { Save } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function field(formData: FormData, name: string): string | undefined {
  const value = String(formData.get(name) ?? "").trim();
  return value || undefined;
}

export default function ChannelSettingsRoute() {
  const [status, setStatus] = useState<string>("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/settings/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: {
          sendgridApiKey: field(formData, "sendgridApiKey"),
          inboundDomain: field(formData, "inboundDomain")
        },
        sms: {
          accountSid: field(formData, "smsAccountSid"),
          authToken: field(formData, "smsAuthToken"),
          phoneNumber: field(formData, "smsPhoneNumber")
        },
        whatsapp: {
          accountSid: field(formData, "whatsappAccountSid"),
          authToken: field(formData, "whatsappAuthToken"),
          phoneNumber: field(formData, "whatsappPhoneNumber")
        }
      })
    });
    setStatus(response.ok ? "Guardado" : "No se pudo guardar la configuracion");
  }

  return (
    <section className="mx-auto max-w-6xl space-y-stack-lg p-container-padding">
      <div>
        <p className="text-label-sm uppercase text-primary">Ajustes del sistema</p>
        <h1 className="text-display-lg text-on-background">Configuración de canales</h1>
        <p className="text-body-md text-secondary">Guarda credenciales de la agencia para email, SMS y WhatsApp.</p>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-stack-lg xl:grid-cols-3">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="border-b border-outline-variant bg-surface-bright p-4">
            <h2 className="text-headline-sm text-on-surface">Email</h2>
            <p className="text-body-sm text-secondary">Salida transaccional por SendGrid.</p>
          </div>
          <div className="grid gap-3 p-4">
            <div className="space-y-2">
              <Label htmlFor="sendgridApiKey">API Key de SendGrid</Label>
              <Input id="sendgridApiKey" name="sendgridApiKey" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inboundDomain">Dominio inbound</Label>
              <Input id="inboundDomain" name="inboundDomain" placeholder="demo.local" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="border-b border-outline-variant bg-surface-bright p-4">
            <h2 className="text-headline-sm text-on-surface">SMS</h2>
            <p className="text-body-sm text-secondary">Mensajeria de texto por Twilio.</p>
          </div>
          <div className="grid gap-3 p-4">
            <div className="space-y-2">
              <Label htmlFor="smsAccountSid">Account SID</Label>
              <Input id="smsAccountSid" name="smsAccountSid" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smsAuthToken">Auth Token</Label>
              <Input id="smsAuthToken" name="smsAuthToken" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smsPhoneNumber">Numero de Twilio</Label>
              <Input id="smsPhoneNumber" name="smsPhoneNumber" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="border-b border-outline-variant bg-surface-bright p-4">
            <h2 className="text-headline-sm text-on-surface">WhatsApp Business</h2>
            <p className="text-body-sm text-secondary">API vía Twilio para conversaciones.</p>
          </div>
          <div className="grid gap-3 p-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappAccountSid">Account SID</Label>
              <Input id="whatsappAccountSid" name="whatsappAccountSid" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappAuthToken">Auth Token</Label>
              <Input id="whatsappAuthToken" name="whatsappAuthToken" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappPhoneNumber">Numero de WhatsApp</Label>
              <Input id="whatsappPhoneNumber" name="whatsappPhoneNumber" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 xl:col-span-3">
          <Button type="submit">
            <Save className="h-4 w-4" />
            Guardar
          </Button>
          <span className="text-body-sm text-secondary">{status}</span>
        </div>
      </form>
    </section>
  );
}
