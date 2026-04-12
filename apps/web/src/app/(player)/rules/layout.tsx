import { headers } from 'next/headers'
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reglas del Juego",
  description:
    "Aprende cómo jugar a la Primera Riverada. Reglamento oficial, combinaciones de cartas, puntuación y normas de fair play del club.",
  alternates: {
    canonical: "/rules",
  },
};

export default async function RulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "¿Qué es Primera Riverada los 4 Ases?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Primera Riverada los 4 Ases es un club privado de cartas online donde se juega a la Primera, un juego tradicional donde el objetivo es acumular puntos capturando cartas de la mesa que sumen 15 o mediante combinaciones especiales.",
        },
      },
      {
        "@type": "Question",
        "name": "¿Cuáles son las normas de Fair Play?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "El uso de software externo o colusión entre jugadores resultará en la suspensión inmediata de la cuenta. Jugamos limpio para divertirnos todos.",
        },
      },
      {
        "@type": "Question",
        "name": "¿Cómo se gestionan los fondos?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Cada mesa tiene un monto de entrada (Buy-in). Asegúrate de tener saldo suficiente antes de unirte. Los retiros se procesan en un plazo de 24hs hábiles.",
        },
      },
    ],
  };

  return (
    <>
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
