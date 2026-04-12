import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://primerariveradalos4ases.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      // Block AI training crawlers (defense-in-depth, Cloudflare managed robots.txt also blocks these)
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ChatGPT-User", disallow: "/" },
      { userAgent: "ClaudeBot", disallow: "/" },
      { userAgent: "Google-Extended", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "Bytespider", disallow: "/" },
      { userAgent: "Amazonbot", disallow: "/" },
      { userAgent: "Applebot-Extended", disallow: "/" },
      { userAgent: "meta-externalagent", disallow: "/" },
      { userAgent: "PerplexityBot", disallow: "/" },
      { userAgent: "anthropic-ai", disallow: "/" },
      { userAgent: "cohere-ai", disallow: "/" },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
