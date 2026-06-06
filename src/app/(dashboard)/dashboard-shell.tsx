"use client";

import { AppWindow, Bell, Building2, LogOut, Plus } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { DashboardNav } from "@/app/(dashboard)/dashboard-nav";

interface MeResponse {
  data: {
    id: string;
    email: string;
    role: string;
    agency: {
      name: string;
      slug: string;
      logo: string | null;
      primaryColor: string | null;
      plan: string;
    };
  };
}

function hexToHsl(hex: string): string {
  const normalized = hex.replace("#", "");
  const red = parseInt(normalized.slice(0, 2), 16) / 255;
  const green = parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === red) {
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
    hue *= 60;
  }

  return `${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export function DashboardShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [me, setMe] = useState<MeResponse["data"] | null>(null);

  useEffect(() => {
    async function loadMe(): Promise<void> {
      const response = await fetch("/api/me");
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as MeResponse;
      setMe(payload.data);
    }
    void loadMe();
  }, []);

  const style = useMemo(() => {
    const primaryColor = me?.agency.primaryColor;
    if (!primaryColor || !/^#[0-9a-f]{6}$/i.test(primaryColor)) {
      return undefined;
    }
    return { "--primary": hexToHsl(primaryColor) } as CSSProperties;
  }, [me]);

  return (
    <div className="min-h-screen bg-background text-on-surface" style={style}>
      <aside className="fixed left-0 top-0 z-50 flex h-full w-sidebar-width flex-col border-r border-outline-variant bg-surface-container-lowest py-stack-lg">
        <div className="mb-stack-lg flex items-center gap-3 px-container-padding">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-display-md font-semibold leading-6 text-primary">{me?.agency.name ?? "CRM Ventas"}</p>
            <p className="truncate text-label-sm uppercase text-secondary">{me?.agency.plan ?? "Workspace de agencia"}</p>
          </div>
        </div>
        <DashboardNav />
        <div className="mx-3 mt-auto space-y-2 border-t border-outline-variant pt-stack-md">
          <div className="rounded-lg bg-surface-container-low px-3 py-2">
            <p className="truncate text-label-md text-on-surface">{me?.email ?? "Cargando usuario..."}</p>
            <p className="text-label-sm uppercase text-secondary">{me?.role ?? ""}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start text-secondary hover:bg-surface-container-low hover:text-on-surface" onClick={() => void signOut({ callbackUrl: "/login" })}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-between border-b border-outline-variant bg-surface px-gutter">
        <div className="min-w-0">
          <p className="truncate text-label-md font-semibold text-on-surface">Workspace comercial</p>
          <p className="truncate text-label-sm text-secondary">CRM, inbox, formularios y automatizaciones</p>
        </div>
        <div className="flex items-center gap-stack-sm">
          <Button variant="ghost" className="h-9 w-9 px-0 text-secondary hover:bg-surface-container-low hover:text-primary" aria-label="Notificaciones">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="h-9 w-9 px-0 text-secondary hover:bg-surface-container-low hover:text-primary" aria-label="Aplicaciones">
            <AppWindow className="h-4 w-4" />
          </Button>
          <Button className="rounded bg-primary px-4 text-label-md text-primary-foreground hover:bg-primary-container">
            <Plus className="h-4 w-4" />
            Nuevo registro
          </Button>
          <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-tertiary-fixed text-label-md font-semibold text-tertiary">
            {me?.email?.slice(0, 1).toUpperCase() ?? "U"}
          </div>
        </div>
      </header>

      <main className="ml-sidebar-width mt-16 min-h-[calc(100vh-64px)] min-w-0 bg-background">{children}</main>
    </div>
  );
}
