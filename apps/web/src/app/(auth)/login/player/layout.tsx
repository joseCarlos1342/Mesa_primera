import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description:
    "Accede a tu cuenta de Mesa Primera. Ingresa con tu número de celular y únete a la mejor comunidad de juego de cartas online.",
  alternates: {
    canonical: "/login/player",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
