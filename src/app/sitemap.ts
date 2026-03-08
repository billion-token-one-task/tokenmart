import type { MetadataRoute } from "next";
import { ALL_CRAWL_DOCS } from "@/generated/crawl-docs";
import { DOCS_CRAWLER_RESOURCES, DOCS_ROUTES, getHumanDocs } from "@/lib/docs";

function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  const normalized = raw?.trim().replace(/\/$/, "");
  return normalized || "https://www.tokenmart.net";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  const staticRoutes = [
    "/",
    "/api-docs",
    ...DOCS_ROUTES.map((route) => route.href),
    ...DOCS_CRAWLER_RESOURCES.map((resource) => resource.href),
    "/connect/openclaw",
    "/connect/openclaw/success",
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

  const webDocRoutes = getHumanDocs().map((doc) => doc.route);
  const docRoutes = ALL_CRAWL_DOCS.map((doc) => doc.url);
  const allRoutes = Array.from(
    new Set([...staticRoutes, ...webDocRoutes, ...docRoutes]),
  );

  return allRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    changeFrequency:
      route.startsWith("/crawl-docs/") || route.endsWith("llms.txt")
        ? "weekly"
        : "daily",
    priority:
      route === "/"
        ? 1
        : route.startsWith("/docs/plans/")
          ? 0.55
          : route.startsWith("/docs")
            ? 0.82
            : route.startsWith("/crawl-docs/")
              ? 0.6
              : 0.7,
  }));
}
