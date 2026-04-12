import type { Metadata, Viewport } from "next";
import { headers } from 'next/headers'
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
    "juego de primera",
    "juego de cartas online",
    "cartas multijugador",
    "primera cartas",
    "jugar a la primera",
    "club de cartas",
    "cartas en línea",
    "mesa de cartas",
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
    "name": "Primera Riverada los 4 Ases",
    "url": "https://primerariveradalos4ases.com",
    "logo": "https://primerariveradalos4ases.com/icons/icon-512x512.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": "es",
    },
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

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="4 Ases" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#10b981" />
        <script nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: runtimeSupabaseEnvScript,
          }}
        />
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webAppJsonLd),
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
