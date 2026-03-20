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
  title: "Mesa Primera",
  description: "Juego de Cartas Multijugador",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${outfit.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClientErrorSuppressor />
        {children}
      </body>
    </html>
  );
}
