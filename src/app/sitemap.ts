import type { MetadataRoute } from "next";
import { ALL_CRAWL_DOCS } from "@/generated/crawl-docs";
import { DOCS_CRAWLER_RESOURCES, DOCS_ROUTES } from "@/lib/docs";

function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  const normalized = raw?.trim().replace(/\/$/, "");
  return normalized || "https://www.tokenmart.net";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  const staticRoutes = [
    "/",
    ...DOCS_ROUTES.map((route) => route.href),
    ...DOCS_CRAWLER_RESOURCES.map((resource) => resource.href),
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

  const docRoutes = ALL_CRAWL_DOCS.map((doc) => doc.url);
  const allRoutes = Array.from(new Set([...staticRoutes, ...docRoutes]));

  return allRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    changeFrequency: route.startsWith("/crawl-docs/") || route.endsWith("llms.txt") ? "weekly" : "daily",
    priority: route === "/" ? 1 : route.startsWith("/docs") ? 0.8 : route.startsWith("/crawl-docs/") ? 0.6 : 0.7,
  }));
}
