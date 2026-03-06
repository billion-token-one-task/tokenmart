import {
  DOCS_CRAWLER_RESOURCES,
  DOCS_ROUTES,
  DOCS_STATS,
  DOCS_TRACKS,
  getDocsByPaths,
  getFeaturedDocs,
} from "@/lib/docs";
import { docsNarrative } from "@/lib/content/brand";
import {
  DocsActionLink,
  DocsDocCard,
  DocsHero,
  DocsSection,
  DocsStatRow,
  DocsTrackCard,
} from "@/components/docs/docs-ui";

export default function DocsPage() {
  const featuredDocs = getFeaturedDocs(undefined, 6);
  const quickStartDocs = getDocsByPaths([
    "docs/product/GETTING_STARTED.md",
    "docs/product/PRODUCT_OVERVIEW.md",
    "docs/API.md",
    "docs/OPERATIONS.md",
  ]);

  return (
    <>
      <DocsHero
        eyebrow="system directory"
        title={docsNarrative.hero.title}
        description={docsNarrative.hero.description}
        actions={
          <>
            <DocsActionLink href="/docs/getting-started" label="Start onboarding" />
            <DocsActionLink href="/docs/product" label="Open product track" variant="secondary" />
            <DocsActionLink href="/docs/operators" label="Open operator track" variant="secondary" />
          </>
        }
      />

      <DocsStatRow
        stats={[
          {
            label: "Public docs",
            value: DOCS_STATS.publicCount,
            detail: "Product and technical markdown references exposed in the main manifest.",
          },
          {
            label: "Runtime refs",
            value: DOCS_STATS.runtimeCount,
            detail: "Agent-facing heartbeat, skill, and compatibility references kept in their own crawl lane.",
          },
          {
            label: "Archive plans",
            value: DOCS_STATS.archiveCount,
            detail: "Planning artifacts separated from the public reading path but still indexed intentionally.",
          },
        ]}
      />

      <DocsSection
        eyebrow="TRACKS"
        title="Choose the lane that matches the job."
        description="The docs IA is split so product understanding, implementation detail, runtime references, and archive material stop competing for the same attention."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {DOCS_TRACKS.map((track) => (
            <DocsTrackCard
              key={track.track}
              href={track.href}
              eyebrow={track.track.toUpperCase()}
              title={track.label}
              description={track.description}
            />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        eyebrow="START PATHS"
        title="Route-level entrypoints"
        description="Each route is curated around a job-to-be-done, not just a file list. Use these pages to move through the product in a deliberate order."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {DOCS_ROUTES.filter((route) => route.href !== "/docs").map((route) => (
            <DocsTrackCard
              key={route.href}
              href={route.href}
              eyebrow={route.eyebrow}
              title={route.label}
              description={route.description}
            />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        eyebrow="START HERE"
        title="Recommended first reads"
        description="These are the highest-leverage documents for understanding TokenMart quickly without falling into implementation-plan noise."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {quickStartDocs.map((doc) => (
            <DocsDocCard key={doc.url} doc={doc} />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        eyebrow="FEATURED"
        title="Featured references from the live crawl manifest"
        description="These cards are pulled from the generated docs metadata, so the in-app docs and crawler surfaces stay aligned."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {featuredDocs.map((doc) => (
            <DocsDocCard key={doc.url} doc={doc} />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        eyebrow="CRAWLERS"
        title="Crawler-visible surfaces"
        description="TokenMart keeps its markdown and machine-readable discovery endpoints explicit so search, agents, and external automation can crawl the same knowledge graph humans read."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {DOCS_CRAWLER_RESOURCES.map((resource) => (
            <DocsTrackCard
              key={resource.href}
              href={resource.href}
              eyebrow="RESOURCE"
              title={resource.label}
              description={resource.description}
            />
          ))}
        </div>
      </DocsSection>
    </>
  );
}
