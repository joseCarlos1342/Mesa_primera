import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar Sesión — Primera Riverada los 4 Ases",
  description:
    "Accede a tu cuenta de Primera Riverada los 4 Ases para jugar cartas online. Ingresa con PIN, huella digital o Google. Club de cartas en Neiva, Huila.",
  alternates: {
    canonical: "https://primerariveradalos4ases.com/login/player",
  },
  keywords: [
    "iniciar sesión primera riverada",
    "login los 4 ases",
    "entrar primera riverada",
    "acceder club de cartas neiva",
    "jugar cartas online login",
  ],
  openGraph: {
    title: "Iniciar Sesión — Primera Riverada los 4 Ases",
    description:
      "Accede a tu cuenta de Primera Riverada. Ingresa con PIN, huella digital o Google. Club de cartas en Neiva.",
    url: "https://primerariveradalos4ases.com/login/player",
    type: "website",
    locale: "es_CO",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Iniciar Sesión — Primera Riverada los 4 Ases" }],
  },
  robots: { index: true, follow: true },
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
      "name": "Iniciar Sesión",
      "item": "https://primerariveradalos4ases.com/login/player",
    },
  ],
};

export default function LoginLayout({
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