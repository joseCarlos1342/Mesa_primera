import type { Metadata, Viewport } from "next";
import { headers } from 'next/headers'
import { Cinzel, Outfit, Geist_Mono } from "next/font/google";
import { ClientErrorSuppressor } from "@/components/ClientErrorSuppressor";
import "./globals.css";

const cinzel = Cinzel({
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://primerariveradalos4ases.com"),
  title: {
    default: "Primera Riverada los 4 Ases | Juego de Cartas Online",
    template: "%s | Primera Riverada los 4 Ases",
  },
  description:
    "Juega a la Primera online con amigos. Club privado de cartas multijugador en tiempo real. Partidas seguras, billetera digital y fair play garantizado.",
  keywords: [
    "Primera Riverada los 4 Ases",
    "primera riverada",
    "primera riverada neiva",
    "los 4 ases",
    "los 4 ases neiva",
    "mesa de juego Dario",
    "tomadero neiva",
    "tomadero con juegos de azar",
    "juego de primera",
    "juego de cartas online",
    "cartas multijugador",
    "primera cartas",
    "jugar a la primera",
    "club de cartas neiva",
    "juegos de azar neiva",
    "mesa de cartas",
    "domino neiva",
    "club de cartas colombia",
    "juegos de mesa neiva huila",
  ],
  authors: [{ name: "Primera Riverada los 4 Ases" }],
  creator: "Primera Riverada los 4 Ases",
  publisher: "Primera Riverada los 4 Ases",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "https://primerariveradalos4ases.com",
    siteName: "Primera Riverada los 4 Ases",
    title: "Primera Riverada los 4 Ases | Juego de Cartas Online",
    description:
      "Juega a la Primera online con amigos. Club privado de cartas en tiempo real con billetera digital.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Primera Riverada los 4 Ases - Mesa de Juego",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Primera Riverada los 4 Ases | Juego de Cartas Online",
    description:
      "Juega a la Primera online con amigos. Club privado de cartas en tiempo real.",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  // Inyectamos tanto el nombre nuevo (`PUBLISHABLE_KEY`) como el legacy
  // (`ANON_KEY`) para que el runtime funcione sin importar cuál esté configurado
  // en Vercel. El cliente resuelve el primero no vacío en `getPublicSupabaseEnv`.
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    "";
  const legacyAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
  const runtimePublicSupabaseEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: legacyAnonKey,
    NEXT_PUBLIC_GAME_SERVER_URL: process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? process.env.GAME_SERVER_URL ?? "",
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.SOCKET_URL ?? "",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  };
  const runtimeSupabaseEnvScript = `window.__MESA_PRIMERA_RUNTIME_ENV__=${JSON.stringify(runtimePublicSupabaseEnv).replace(/</g, "\\u003c")};`;

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Primera Riverada los 4 Ases",
    "alternateName": ["Los 4 Ases", "Mesa Primera", "Primera Riverada"],
    "url": "https://primerariveradalos4ases.com",
    "logo": "https://primerariveradalos4ases.com/icons/icon-512x512.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": "es",
    },
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "EntertainmentBusiness",
    "name": "Primera Riverada los 4 Ases",
    "alternateName": ["Los 4 Ases", "Mesa de Juego Dario", "Tomadero los 4 Ases"],
    "description": "Club presencial y online de juego de cartas Primera, dominó, bebidas y entretenimiento en Neiva, Huila.",
    "url": "https://primerariveradalos4ases.com",
    "image": "https://primerariveradalos4ases.com/og-image.png",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Neiva",
      "addressRegion": "Huila",
      "addressCountry": "CO",
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 2.9273,
      "longitude": -75.2819,
    },
    "priceRange": "$$",
    "currenciesAccepted": "COP",
    "paymentAccepted": "Efectivo, Transferencia",
    "areaServed": {
      "@type": "City",
      "name": "Neiva",
    },
    "keywords": "juego de cartas, primera, dominó, tomadero, juegos de azar, club de cartas, neiva",
    "sameAs": [],
  };

  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Primera Riverada los 4 Ases",
    "url": "https://primerariveradalos4ases.com",
    "applicationCategory": "GameApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "COP",
    },
    "inLanguage": "es",
    "description": "Club privado de cartas multijugador online. Juega a la Primera en tiempo real con amigos.",
  };

  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Primera Riverada los 4 Ases",
    "alternateName": ["Los 4 Ases", "Primera Riverada", "Mesa Primera"],
    "url": "https://primerariveradalos4ases.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://primerariveradalos4ases.com/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="4 Ases" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#10b981" />
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: runtimeSupabaseEnvScript,
          }}
        />
        <script
          nonce={nonce}
          suppressHydrationWarning
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          nonce={nonce}
          suppressHydrationWarning
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessJsonLd),
          }}
        />
        <script
          nonce={nonce}
          suppressHydrationWarning
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webAppJsonLd),
          }}
        />
        <script
          nonce={nonce}
          suppressHydrationWarning
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webSiteJsonLd),
          }}
        />
      </head>
      <body
        className={`${cinzel.variable} ${outfit.variable} ${geistMono.variable} antialiased`}
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
