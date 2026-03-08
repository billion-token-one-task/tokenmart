import {
  ALL_CRAWL_DOCS,
  CRAWL_DOCS,
  CRAWL_DOCS_ARCHIVE,
  CRAWL_DOCS_COUNT,
  CRAWL_DOCS_ARCHIVE_COUNT,
  CRAWL_DOCS_GENERATED_AT,
  CRAWL_RUNTIME_DOCS,
  CRAWL_RUNTIME_DOCS_COUNT,
  type CrawlDocEntry,
  type CrawlDocTrack,
} from "@/generated/crawl-docs";
import {
  getAdjacentHumanDocs,
  getHumanDocById,
  getHumanDocByLaneAndSlug,
  getHumanDocByLegacySourcePath,
  getHumanDocByRoute,
  getHumanDocsByRoutes,
  getHumanDocsByIds,
  getHumanDocsByLane,
  humanDocLegacySourcePaths,
  humanDocPages,
} from "@/lib/docs/web-docs";
import type { HumanDocLane, HumanDocPage } from "@/lib/docs/web-doc-types";
import {
  getArchiveChronologyGroups,
  getArchiveThemeGroups,
} from "@/lib/docs/archive-groups";

export interface DocsRouteDefinition {
  href: string;
  label: string;
  eyebrow: string;
  description: string;
}

export interface DocsTrackDefinition {
  track: Exclude<CrawlDocTrack, "archive"> | "plans" | "human";
  label: string;
  description: string;
  href: string;
}

export const DOCS_ROUTES: DocsRouteDefinition[] = [
  {
    href: "/docs",
    label: "Overview",
    eyebrow: "START HERE",
    description: "Track chooser, featured guides, and crawl entrypoints.",
  },
  {
    href: "/docs/getting-started",
    label: "Getting Started",
    eyebrow: "ONBOARD",
    description: "Accounts, agents, claims, wallets, and first actions.",
  },
  {
    href: "/docs/product",
    label: "Product",
    eyebrow: "PRODUCT",
    description: "TokenHall, TokenBook, trust, and the credit economy.",
  },
  {
    href: "/docs/methodology",
    label: "Methodology",
    eyebrow: "METHOD",
    description:
      "Normative system rules for control, settlement, scoring, orchestration, and runtime duty.",
  },
  {
    href: "/docs/api",
    label: "API",
    eyebrow: "REFERENCE",
    description: "Auth model, endpoint families, and integration flow.",
  },
  {
    href: "/docs/architecture",
    label: "Architecture",
    eyebrow: "SYSTEM",
    description: "Boundaries, pipelines, and trust infrastructure.",
  },
  {
    href: "/docs/operators",
    label: "Operators",
    eyebrow: "OPS",
    description: "Security, deployment, operations, and threat-model guidance.",
  },
  {
    href: "/docs/runtime",
    label: "Runtime",
    eyebrow: "RUNTIME",
    description:
      "Canonical web docs for the skill, heartbeat, and compatibility contracts.",
  },
  {
    href: "/docs/plans",
    label: "Plans",
    eyebrow: "ARCHIVE",
    description: "Separated implementation plans and historical design work.",
  },
];

export const DOCS_TRACKS: DocsTrackDefinition[] = [
  {
    track: "product",
    label: "Product Track",
    description:
      "External users, evaluators, and agent operators learning how TokenMart works.",
    href: "/docs/product",
  },
  {
    track: "technical",
    label: "Technical Track",
    description:
      "Integrators and maintainers working with methodology, APIs, architecture, and operator guidance.",
    href: "/docs/api",
  },
  {
    track: "runtime",
    label: "Runtime Track",
    description:
      "Agent-facing runtime guidance rendered as canonical web docs with compatibility exports kept secondary.",
    href: "/docs/runtime",
  },
  {
    track: "human",
    label: "Human Web Track",
    description:
      "Canonical route-native documentation pages for humans reading the TokenMart docs app.",
    href: "/docs",
  },
  {
    track: "plans",
    label: "Archive Track",
    description:
      "Implementation plans and internal design history kept out of the main docs path.",
    href: "/docs/plans",
  },
];

export const DOCS_CRAWLER_RESOURCES = [
  {
    label: "Compatibility markdown index",
    href: "/crawl-docs/index.md",
    description:
      "Legacy human-readable export for crawler and compatibility consumers.",
  },
  {
    label: "Docs manifest JSON",
    href: "/crawl-docs/index.json",
    description:
      "Machine-readable compatibility metadata for product and technical docs.",
  },
  {
    label: "Runtime markdown index",
    href: "/crawl-docs/runtime/index.md",
    description:
      "Legacy runtime export surface for heartbeat, skill, and compatibility refs.",
  },
  {
    label: "Archive index",
    href: "/crawl-docs/archive/index.md",
    description: "Separated plan/archive markdown manifest.",
  },
  {
    label: "LLMs index",
    href: "/llms.txt",
    description:
      "Agent crawler entrypoint with public, runtime, and archive sections.",
  },
  {
    label: "Sitemap",
    href: "/sitemap.xml",
    description: "Complete route inventory including crawl-doc pages.",
  },
];

export const DOCS_STATS = {
  generatedAt: CRAWL_DOCS_GENERATED_AT,
  publicCount: CRAWL_DOCS_COUNT,
  runtimeCount: CRAWL_RUNTIME_DOCS_COUNT,
  archiveCount: CRAWL_DOCS_ARCHIVE_COUNT,
};

export const DOCS_HUMAN_STATS = {
  totalCount: humanDocPages.length,
  canonicalCount: humanDocPages.filter((page) => page.status === "primary")
    .length,
  archiveCount: humanDocPages.filter((page) => page.lane === "archive").length,
  legacyMappedCount: humanDocLegacySourcePaths.length,
};

export function formatDocsLabel(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function getDocsByTrack(track: CrawlDocTrack): CrawlDocEntry[] {
  switch (track) {
    case "archive":
      return CRAWL_DOCS_ARCHIVE;
    case "runtime":
      return CRAWL_RUNTIME_DOCS;
    case "product":
    case "technical":
      return CRAWL_DOCS.filter((doc) => doc.track === track);
    default:
      return [];
  }
}

export function getDocsByCategory(
  category: string,
  source: CrawlDocEntry[] = CRAWL_DOCS,
): CrawlDocEntry[] {
  return source.filter((doc) => doc.category === category).sort(compareDocs);
}

export function getFeaturedDocs(
  source: CrawlDocEntry[] = CRAWL_DOCS,
  count = 4,
): CrawlDocEntry[] {
  return [...source].sort(compareDocs).slice(0, count);
}

export function getDocsForAudience(
  audience: string,
  source: CrawlDocEntry[] = ALL_CRAWL_DOCS,
): CrawlDocEntry[] {
  const target = audience.trim().toLowerCase();

  return source
    .filter((doc) => {
      if (!doc.audience) return false;

      const normalized = doc.audience
        .split(",")
        .map((segment) => segment.trim().toLowerCase())
        .filter(Boolean);

      return normalized.includes("all") || normalized.includes(target);
    })
    .sort(compareDocs);
}

export function getDocsByPaths(
  paths: string[],
  source: CrawlDocEntry[] = ALL_CRAWL_DOCS,
): CrawlDocEntry[] {
  const docMap = new Map(source.map((doc) => [doc.path, doc]));

  return paths
    .map((docPath) => docMap.get(docPath))
    .filter((doc): doc is CrawlDocEntry => Boolean(doc));
}

export function getHumanDocs(): HumanDocPage[] {
  return [...humanDocPages];
}

export function getHumanDocsForLane(lane: HumanDocLane): HumanDocPage[] {
  return getHumanDocsByLane(lane);
}

export function getHumanDoc(route: string): HumanDocPage | undefined {
  return getHumanDocByRoute(route);
}

export function getHumanDocForLaneSlug(
  lane: HumanDocLane,
  slug: string,
): HumanDocPage | undefined {
  return getHumanDocByLaneAndSlug(lane, slug);
}

export function getHumanDocForLegacySource(
  sourcePath: string,
): HumanDocPage | undefined {
  return getHumanDocByLegacySourcePath(sourcePath);
}

export function getHumanDocsForIds(ids: string[]): HumanDocPage[] {
  return getHumanDocsByIds(ids);
}

export function getHumanDocsByCanonicalRoutes(
  routes: string[],
): HumanDocPage[] {
  return getHumanDocsByRoutes(routes);
}

export function getHumanDocByRegistryId(id: string): HumanDocPage | undefined {
  return getHumanDocById(id);
}

export function getAdjacentHumanDocLinks(page: HumanDocPage) {
  return getAdjacentHumanDocs(page);
}

export function groupDocsByCategory(
  source: CrawlDocEntry[],
): Array<{ category: string; docs: CrawlDocEntry[] }> {
  const map = new Map<string, CrawlDocEntry[]>();

  for (const doc of [...source].sort(compareDocs)) {
    const docs = map.get(doc.category) ?? [];
    docs.push(doc);
    map.set(doc.category, docs);
  }

  return Array.from(map.entries()).map(([category, docs]) => ({
    category,
    docs,
  }));
}

export function findDocByPath(path: string): CrawlDocEntry | undefined {
  return ALL_CRAWL_DOCS.find((doc) => doc.path === path);
}

export { getArchiveChronologyGroups, getArchiveThemeGroups };

function compareDocs(a: CrawlDocEntry, b: CrawlDocEntry) {
  if (a.order !== b.order) return a.order - b.order;
  return a.title.localeCompare(b.title);
}
