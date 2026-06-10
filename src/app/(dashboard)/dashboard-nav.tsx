"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, Inbox, Kanban, Settings, Sparkles, Users, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, exact: true },
  { href: "/dashboard/contacts", label: "Contactos", icon: Users },
  { href: "/dashboard/leads", label: "Leads IA", icon: Sparkles },
  { href: "/dashboard/pipelines", label: "Pipelines", icon: Kanban },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/workflows", label: "Automatizaciones", icon: Workflow },
  { href: "/dashboard/forms", label: "Formularios", icon: FileText },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings }
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-1 md:flex-col md:overflow-visible md:pb-0">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-9 shrink-0 items-center gap-3 rounded-lg px-3 text-body-sm font-medium text-secondary transition-colors hover:bg-surface-container-low hover:text-on-surface active:scale-95",
              active && "border-r-2 border-primary bg-surface-container text-primary"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
