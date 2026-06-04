import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Ventas",
  description: "Plataforma SaaS de CRM, ventas y automatizacion"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
