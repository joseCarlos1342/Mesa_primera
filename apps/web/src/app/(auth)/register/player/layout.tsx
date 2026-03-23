import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registrarse",
  description:
    "Crea tu cuenta en Mesa Primera y comienza a jugar hoy mismo. Únete al club privado de cartas más exclusivo de habla hispana.",
  alternates: {
    canonical: "/register/player",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
