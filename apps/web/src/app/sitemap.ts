import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://primerariveradalos4ases.com";

  return [
    {
      url: baseUrl,
      lastModified: "2025-04-01",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/login/player`,
      lastModified: "2025-04-01",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/register/player`,
      lastModified: "2025-04-01",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/rules`,
      lastModified: "2025-04-01",
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: "2025-04-01",
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: "2025-04-01",
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/security-policy`,
      lastModified: "2025-04-01",
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}