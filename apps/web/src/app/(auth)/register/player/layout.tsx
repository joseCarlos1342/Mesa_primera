import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crear Cuenta — Primera Riverada los 4 Ases",
  description:
    "Únete a Primera Riverada los 4 Ases. Crea tu cuenta gratis y comienza a jugar cartas online en el club más exclusivo de Neiva, Huila.",
  alternates: {
    canonical: "https://primerariveradalos4ases.com/register/player",
  },
  keywords: [
    "registrarse primera riverada",
    "crear cuenta los 4 ases",
    "unirse club de cartas neiva",
    "registro primera riverada",
  ],
  openGraph: {
    title: "Crear Cuenta — Primera Riverada los 4 Ases",
    description:
      "Regístrate gratis y empieza a jugar Primera online. Club de cartas en Neiva, Huila.",
    url: "https://primerariveradalos4ases.com/register/player",
    type: "website",
    locale: "es_CO",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Crear Cuenta — Primera Riverada los 4 Ases" }],
  },
  robots: { index: true, follow: true },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
