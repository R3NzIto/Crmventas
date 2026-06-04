import Link from "next/link";

export default function DashboardSettingsRoute() {
  const links = [
    { href: "/dashboard/settings/profile", label: "Perfil de agencia", description: "Marca, slug, plan y color del dashboard." },
    { href: "/dashboard/settings/users", label: "Usuarios", description: "Gestiona administradores y usuarios de la agencia." },
    { href: "/dashboard/settings/channels", label: "Canales", description: "Credenciales de SendGrid, SMS y WhatsApp." }
  ];

  return (
    <section className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuracion</h1>
        <p className="text-sm text-muted-foreground">Configura el workspace de tu agencia.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {links.map((link) => (
          <Link key={link.href} className="rounded-lg border p-4 hover:bg-muted/60" href={link.href}>
            <h2 className="font-semibold">{link.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
