import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registrarse",
  description:
    "Crea tu cuenta en Primera Riverada los 4 Ases y comienza a jugar hoy. Únete al club privado de cartas más exclusivo.",
  alternates: {
    canonical: "/register/player",
  },
  robots: { index: false, follow: true },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
