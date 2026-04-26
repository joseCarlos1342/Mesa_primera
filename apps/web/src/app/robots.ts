import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://primerariveradalos4ases.com";
  const geoAllowedPublicRoutes = [
    "/",
    "/rules",
    "/privacy",
    "/terms",
    "/security-policy",
  ];

  const geoCrawlers = [
    "GPTBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Google-Extended",
    "CCBot",
    "Bytespider",
    "Amazonbot",
    "Applebot-Extended",
    "meta-externalagent",
    "PerplexityBot",
    "anthropic-ai",
    "cohere-ai",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Auth-protected player routes (behind login)
          "/dashboard",
          "/replays",
          "/friends",
          "/leaderboard",
          "/lobby",
          "/profile",
          "/stats",
          "/wallet",
          // Admin panel
          "/admin",
          // API and internal
          "/api/",
          "/play/",
          // SEO redirect slug (already 301s to /)
          "/primera-riverada-los-4-ases",
        ],
      },
      // GEO policy: allow only landing/legal routes for AI crawlers while keeping everything else blocked.
      ...geoCrawlers.map((userAgent) => ({
        userAgent,
        allow: geoAllowedPublicRoutes,
        disallow: "/",
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
