"use client";

import { LogOut } from "lucide-react";
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
    <div className="min-h-screen bg-background md:grid md:grid-cols-[15rem_1fr]" style={style}>
      <aside className="flex border-b px-3 py-4 md:border-b-0 md:border-r">
        <div className="flex min-h-full w-full flex-col">
          <div className="mb-4 px-3 md:mb-6">
            <p className="text-sm font-semibold">{me?.agency.name ?? "CRM Ventas"}</p>
            <p className="text-xs text-muted-foreground">{me?.agency.plan ?? "Workspace de agencia"}</p>
          </div>
          <DashboardNav />
          <div className="mt-4 space-y-2 border-t pt-3 md:mt-auto">
            <div className="px-3">
              <p className="truncate text-xs font-medium">{me?.email ?? "Cargando usuario..."}</p>
              <p className="text-xs text-muted-foreground">{me?.role ?? ""}</p>
            </div>
            <Button variant="ghost" className="w-full justify-start" onClick={() => void signOut({ callbackUrl: "/login" })}>
              <LogOut className="h-4 w-4" />
              Cerrar sesion
            </Button>
          </div>
        </div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
