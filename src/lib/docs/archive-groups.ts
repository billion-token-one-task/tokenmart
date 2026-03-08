import { archiveHumanDocs } from "@/lib/docs/web-docs-archive";
import type { HumanDocPage } from "@/lib/docs/web-doc-types";

interface ArchiveDocSeedMeta {
  slug: string;
  themes: string[];
}

const archiveSeedMeta: ArchiveDocSeedMeta[] = [
  {
    slug: "2026-03-05-comprehensive-backend-hardening",
    themes: ["backend hardening", "auth", "schema safety", "integrity"],
  },
  {
    slug: "2026-03-05-release-readme-keys",
    themes: ["release readiness", "docs", "key UX"],
  },
  {
    slug: "2026-03-05-tokenhall-prod-streaming-openrouter-model-catalog",
    themes: ["tokenhall", "streaming", "model catalog", "provider routing"],
  },
  {
    slug: "2026-03-05-wallet-transfer-and-agent-activity-maximalist",
    themes: ["wallet transfers", "agent activity", "runtime docs"],
  },
  {
    slug: "2026-03-06-tokenmart-rebrand-and-product-redesign",
    themes: ["rebrand", "product redesign", "design system"],
  },
  {
    slug: "2026-03-07-reference-video-editorial-overhaul-design",
    themes: ["editorial design", "visual direction", "brand system"],
  },
  {
    slug: "2026-03-07-reference-video-editorial-overhaul-implementation",
    themes: ["implementation", "shared primitives", "frontend overhaul"],
  },
  {
    slug: "2026-03-08-orchestration-audit-remediation",
    themes: ["orchestration", "audit", "remediation", "work graph"],
  },
  {
    slug: "2026-03-08-trust-orchestration-overhaul",
    themes: ["trust overhaul", "service health", "orchestration capability"],
  },
];

const archiveSeedMetaMap = new Map(
  archiveSeedMeta.map((item) => [item.slug, item]),
);

function parseArchiveDate(slug: string) {
  const rawDate = slug.slice(0, 10);
  const parsed = new Date(`${rawDate}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export function formatArchiveDateLabel(slug: string) {
  const parsed = parseArchiveDate(slug);
  if (!parsed) return "Undated";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function getArchiveChronologyGroups() {
  const grouped = new Map<string, HumanDocPage[]>();

  for (const page of archiveHumanDocs) {
    const label = formatArchiveDateLabel(page.slug);
    const pages = grouped.get(label) ?? [];
    pages.push(page);
    grouped.set(label, pages);
  }

  return Array.from(grouped.entries())
    .map(([label, pages]) => ({
      label,
      pages: [...pages].sort((left, right) => right.order - left.order),
    }))
    .sort((left, right) => {
      const leftDate = parseArchiveDate(left.pages[0]?.slug ?? "")?.getTime() ?? 0;
      const rightDate =
        parseArchiveDate(right.pages[0]?.slug ?? "")?.getTime() ?? 0;
      return rightDate - leftDate;
    });
}

export function getArchiveThemeGroups() {
  const grouped = new Map<string, HumanDocPage[]>();

  for (const page of archiveHumanDocs) {
    const themes = archiveSeedMetaMap.get(page.slug)?.themes ?? [];

    for (const theme of themes) {
      const pages = grouped.get(theme) ?? [];
      pages.push(page);
      grouped.set(theme, pages);
    }
  }

  return Array.from(grouped.entries())
    .map(([theme, pages]) => ({
      theme,
      pages: [...pages].sort((left, right) => right.order - left.order),
    }))
    .sort((left, right) => {
      if (right.pages.length !== left.pages.length) {
        return right.pages.length - left.pages.length;
      }

      return left.theme.localeCompare(right.theme);
    });
}
