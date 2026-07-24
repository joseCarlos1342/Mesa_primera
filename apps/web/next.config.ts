import type { NextConfig } from "next";

import withPWAInit from "@ducanh2912/next-pwa";

const publicDevHost = process.env.PUBLIC_DEV_HOST?.trim();

const allowedDevOrigins = [
  'localhost',
  '127.0.0.1',
  publicDevHost || undefined,
].filter((origin): origin is string => Boolean(origin));

const withPWA = withPWAInit({
  dest: "public",
  customWorkerSrc: "worker",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

// ---------------------------------------------------------------------------
// Security headers applied to every response
// ---------------------------------------------------------------------------
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), payment=()",
  },
  {
    key: "Access-Control-Allow-Origin",
    value: "https://primerariveradalos4ases.com",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
  // Disable Cloudflare Email Address Obfuscation — its injected script
  // violates our strict-dynamic CSP and there is no way to nonce it.
  { key: "X-Email-Obfuscation", value: "off" },
];

const socialImageHeaders = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
  { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: true,
  turbopack: {},
  allowedDevOrigins,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'framer-motion', 'gsap', '@gsap/react'],
    serverActions: {
      // Adjuntos de consultas: máximo de archivo 10 MB más multipart.
      bodySizeLimit: '12mb',
    },
  },
  async redirects() {
    return [
      // RFC 9116: redirect the root-level fallback to the canonical .well-known location
      {
        source: '/security.txt',
        destination: '/.well-known/security.txt',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/og-image",
        headers: socialImageHeaders,
      },
      {
        source: "/og-image.png",
        headers: socialImageHeaders,
      },
    ];
  },
};

export default withPWA(nextConfig);
