import type { Metadata } from "next";
import { Playfair_Display, Outfit, Geist_Mono } from "next/font/google";
import { ClientErrorSuppressor } from "@/components/ClientErrorSuppressor";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mesaprimera.com"),
  title: {
    default: "Mesa Primera | Juego de Cartas Multijugador",
    template: "%s | Mesa Primera",
  },
  description:
    "Disfruta de Mesa Primera, el mejor juego de cartas multijugador online. Juega con amigos, compite en torneos y demuestra tu habilidad.",
  keywords: [
    "Mesa Primera",
    "juego de cartas",
    "multijugador",
    "casino online",
    "cartas online",
    "amigos",
    "solitario",
  ],
  authors: [{ name: "Mesa Primera Team" }],
  creator: "Mesa Primera Team",
  publisher: "Mesa Primera Team",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://mesaprimera.com",
    siteName: "Mesa Primera",
    title: "Mesa Primera | Juego de Cartas Multijugador",
    description:
      "Juega a Mesa Primera con amigos. El juego de cartas más emocionante y social.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mesa Primera - Mesa de Juego",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mesa Primera | Juego de Cartas Multijugador",
    description:
      "Juega a Mesa Primera con amigos. El juego de cartas más emocionante y social.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

import { FramerMotionProvider } from "@/components/providers/FramerMotionProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtimePublicSupabaseEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "",
    NEXT_PUBLIC_GAME_SERVER_URL: process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? process.env.GAME_SERVER_URL ?? "",
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.SOCKET_URL ?? "",
  };
  const runtimeSupabaseEnvScript = `window.__MESA_PRIMERA_RUNTIME_ENV__=${JSON.stringify(runtimePublicSupabaseEnv).replace(/</g, "\\u003c")};`;

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Mesa Primera",
    "url": "https://mesaprimera.com",
    "logo": "https://mesaprimera.com/logo.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "email": "admin@mesaprimera.com",
    },
  };

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: runtimeSupabaseEnvScript,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      <body
        className={`${playfair.variable} ${outfit.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClientErrorSuppressor />
        <FramerMotionProvider>
          {children}
        </FramerMotionProvider>
      </body>
    </html>
  );
}
