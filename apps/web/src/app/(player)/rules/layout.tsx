import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reglas del Juego",
  description:
    "Aprende cómo jugar a Mesa Primera. Conoce el reglamento oficial, las combinaciones de cartas y las normas de fair play de nuestro club privado.",
  alternates: {
    canonical: "/rules",
  },
};

export default function RulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "¿Qué es Mesa Primera?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Mesa Primera es un juego de cartas tradicional donde el objetivo es acumular puntos capturando cartas de la mesa que sumen 15 o mediante combinaciones especiales.",
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
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
