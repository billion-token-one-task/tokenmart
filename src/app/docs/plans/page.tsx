import { DOCS_CRAWLER_RESOURCES, getDocsByTrack } from "@/lib/docs";
import {
  DocsActionLink,
  DocsDetailGrid,
  DocsDocCard,
  DocsHero,
  DocsSection,
  DocsTrackCard,
} from "@/components/docs/docs-ui";

export default function PlansDocsPage() {
  const archiveDocs = getDocsByTrack("archive");

  return (
    <>
      <DocsHero
        eyebrow="ARCHIVE"
        title="Implementation plans stay visible, but they no longer pollute the primary docs path."
        description="This route is the archive lane for historical rollout plans, design rationale, and implementation sequencing. It is useful for maintainers and reviewers, but intentionally separated from the product and technical tracks that new readers should start with."
        actions={
          <>
            <DocsActionLink href="/docs" label="Back to docs overview" />
            <DocsActionLink href="/crawl-docs/archive/index.md" label="Open archive manifest" variant="secondary" />
          </>
        }
      />

      <DocsSection
        eyebrow="WHY SEPARATE IT"
        title="Why plans live here"
        description="Archive material is important, but it should not be mistaken for stable product or operator documentation."
      >
        <DocsDetailGrid
          items={[
            {
              eyebrow: "SIGNAL",
              title: "Public docs stay cleaner",
              description: "New users and integrators should hit current explanations first instead of wading through historical implementation strategy.",
            },
            {
              eyebrow: "TRACEABILITY",
              title: "Maintainers still keep history",
              description: "Plans remain available for change archaeology, rollout rationale, and reconstruction of why certain decisions were made.",
            },
            {
              eyebrow: "CRAWL",
              title: "Archive is still machine-readable",
              description: "The archive is explicitly indexed under its own manifest so agents and crawlers can reach it without it leaking into the main manifest.",
            },
            {
              eyebrow: "BOUNDARY",
              title: "Stable docs vs design history",
              description: "The split makes it clear which materials are normative references and which are snapshots of internal planning state.",
            },
          ]}
        />
      </DocsSection>

      <DocsSection
        eyebrow="ARCHIVE DOCS"
        title="Plan library"
        description="These markdown files are the archived implementation plans currently indexed under the separate archive manifest."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {archiveDocs.map((doc) => (
            <DocsDocCard key={doc.url} doc={doc} />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        eyebrow="INDEXES"
        title="Archive-adjacent crawler resources"
        description="These resources expose the archive split explicitly alongside the main public and runtime manifests."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {DOCS_CRAWLER_RESOURCES.filter((resource) => resource.href.includes("archive") || resource.href.endsWith("llms.txt")).map((resource) => (
            <DocsTrackCard
              key={resource.href}
              href={resource.href}
              eyebrow="RESOURCE"
              title={resource.label}
              description={`${resource.href} · ${resource.description}`}
            />
          ))}
        </div>
      </DocsSection>
    </>
  );
}
