import type { Metadata } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "M&A Repuestos | Sistema de Servicio Técnico",
  description: "Gestión de clientes, órdenes, diagnósticos, fotografías, cobros y garantías para M&A Repuestos.",
  manifest: "/manifest.webmanifest",
  themeColor: "#0b1e32",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "M&A Repuestos" },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/brand-logo.jpg",
    shortcut: "/brand-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased"><PwaRegister />{children}</body>
    </html>
  );
}
