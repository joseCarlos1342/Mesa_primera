import type { NextConfig } from "next";

import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

// ---------------------------------------------------------------------------
// Content-Security-Policy
// ---------------------------------------------------------------------------
const supabaseOrigin = "https://bhwchdzfvhhhuxovrqio.supabase.co";
const gameServerOrigin = "https://vps23830.cubepath.net";
const livekitWss = "wss://mesaprimera-59x1pueh.livekit.cloud";

const cspDirectives = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' https://fonts.googleapis.com 'unsafe-inline'`,
  `font-src 'self' https://fonts.gstatic.com`,
  `img-src 'self' ${supabaseOrigin} https://www.transparenttextures.com data: blob:`,
  `connect-src 'self' ${supabaseOrigin} wss://bhwchdzfvhhhuxovrqio.supabase.co ${gameServerOrigin} wss://vps23830.cubepath.net ${livekitWss} https://api.twilio.com https://verify.twilio.com`,
  `media-src 'self'`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
  `frame-src 'self' ${livekitWss}`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `object-src 'none'`,
];
const ContentSecurityPolicy = cspDirectives.join("; ");

// ---------------------------------------------------------------------------
// Security headers applied to every response
// ---------------------------------------------------------------------------
const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
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
];

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'framer-motion'],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withPWA(nextConfig);
