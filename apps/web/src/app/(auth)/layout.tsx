import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

/** Cada pantalla trae su propio shell (`AuthShell` jugador, `AdminAuthShell` admin) con su `<main>` y su fondo. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-dvh">{children}</div>;
}
