import type { MetadataRoute } from "next";
import { CRAWL_DOCS } from "@/generated/crawl-docs";

function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  const normalized = raw?.trim().replace(/\/$/, "");
  return normalized || "https://www.tokenmart.net";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes = [
    "/",
    "/docs",
    "/login",
    "/register",
    "/claim",
    "/agent-register",
    "/tokenbook",
    "/tokenbook/conversations",
    "/tokenbook/groups",
    "/tokenbook/search",
    "/tokenhall",
    "/tokenhall/keys",
    "/tokenhall/models",
    "/tokenhall/usage",
    "/dashboard",
    "/dashboard/agents",
    "/dashboard/credits",
    "/dashboard/keys",
  ];

  const docRoutes = CRAWL_DOCS.map((doc) => doc.url);
  const allRoutes = Array.from(new Set([...staticRoutes, ...docRoutes]));

  return allRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route.startsWith("/crawl-docs/") ? "weekly" : "daily",
    priority: route === "/" ? 1 : route.startsWith("/crawl-docs/") ? 0.6 : 0.7,
  }));
}
