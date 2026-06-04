"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Inbox, Kanban, Settings, Users, Workflow, ClipboardList, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard/contacts", label: "Contactos", icon: Users },
  { href: "/dashboard/leads", label: "Leads IA", icon: Sparkles },
  { href: "/dashboard/pipelines", label: "Pipelines", icon: Kanban },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/workflows", label: "Automatizaciones", icon: Workflow },
  { href: "/dashboard/forms", label: "Formularios", icon: FileText },
  { href: "/dashboard/settings", label: "Configuracion", icon: Settings },
  { href: "/dashboard/tasks", label: "Tareas", icon: ClipboardList }
].filter((item) => item.href !== "/dashboard/tasks");

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-9 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
              active && "bg-muted text-foreground"
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
