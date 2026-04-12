import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activar Huella Digital",
  description:
    "Configura el acceso biométrico a tu cuenta en Primera Riverada los 4 Ases. Desbloquea tu cuenta con huella digital o reconocimiento facial.",
  alternates: {
    canonical: "/register/player/biometric",
  },
};

export default function BiometricLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
