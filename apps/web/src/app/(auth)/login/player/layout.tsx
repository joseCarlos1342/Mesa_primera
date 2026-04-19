import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description:
    "Accede a tu cuenta de Primera Riverada los 4 Ases. Ingresa con tu número de celular y vuelve a la mesa.",
  alternates: {
    canonical: "/login/player",
  },
  robots: { index: false, follow: true },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
