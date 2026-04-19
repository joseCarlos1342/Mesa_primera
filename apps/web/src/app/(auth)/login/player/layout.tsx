import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar Sesión — Primera Riverada los 4 Ases",
  description:
    "Accede a tu cuenta de Primera Riverada los 4 Ases. Ingresa con tu número de celular y clave para volver a la mesa. Acceso seguro con PIN, huella o Google.",
  alternates: {
    canonical: "https://primerariveradalos4ases.com/login/player",
  },
  keywords: [
    "iniciar sesión primera riverada",
    "login los 4 ases",
    "entrar primera riverada",
    "acceder club de cartas neiva",
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

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
