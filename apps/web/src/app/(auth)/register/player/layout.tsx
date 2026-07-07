import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crear Cuenta — Primera Riverada los 4 Ases",
  description:
    "Crea tu cuenta gratis en Primera Riverada los 4 Ases y comienza a jugar cartas online. Registro rápido con celular o Google. Club de cartas en Neiva, Huila.",
  alternates: {
    canonical: "https://primerariveradalos4ases.com/register/player",
  },
  keywords: [
    "registrarse primera riverada",
    "crear cuenta los 4 ases",
    "unirse club de cartas neiva",
    "registro primera riverada",
    "jugar cartas online registro",
  ],
  openGraph: {
    title: "Crear Cuenta — Primera Riverada los 4 Ases",
    description:
      "Regístrate gratis y empieza a jugar Primera online. Club de cartas en Neiva, Huila.",
    url: "https://primerariveradalos4ases.com/register/player",
    type: "website",
    locale: "es_CO",
    images: [{ url: "/og-image", width: 1200, height: 630, alt: "Crear Cuenta — Primera Riverada los 4 Ases" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Inicio",
      "item": "https://primerariveradalos4ases.com/",
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Crear Cuenta",
      "item": "https://primerariveradalos4ases.com/register/player",
    },
  ],
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      {children}
    </>
  );
}
