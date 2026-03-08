import {
  DOCS_CRAWLER_RESOURCES,
  getArchiveChronologyGroups,
  getArchiveThemeGroups,
  getHumanDocsForLane,
} from "@/lib/docs";
import {
  DocsActionLink,
  DocsDetailGrid,
  DocsHero,
  DocsPageCard,
  DocsSection,
  DocsStatRow,
  DocsTrackCard,
} from "@/components/docs/docs-ui";

export default function PlansDocsPage() {
  const archiveDocs = getHumanDocsForLane("archive");
  const chronologyGroups = getArchiveChronologyGroups();
  const themeGroups = getArchiveThemeGroups().slice(0, 8);

  return (
    <>
      <DocsHero
        eyebrow="ARCHIVE"
        title="Implementation plans stay visible, but they no longer masquerade as the primary docs path."
        description="The archive lane preserves design intent, rollout sequencing, and change history as web pages. It is useful for maintainers and reviewers, but intentionally separated from the live product, methodology, runtime, and operator lanes."
        actions={
          <>
            <DocsActionLink href="/docs" label="Back to docs overview" />
            <DocsActionLink
              href="/crawl-docs/archive/index.json"
              label="Open archive manifest"
              variant="secondary"
            />
          </>
        }
      />

      <DocsStatRow
        stats={[
          {
            label: "Archive plans",
            value: archiveDocs.length,
            detail:
              "Each legacy plan now has a canonical web page instead of a raw markdown-first destination.",
          },
          {
            label: "Chronology groups",
            value: chronologyGroups.length,
            detail:
              "Plans are grouped by implementation date so the archive reads like design history rather than a flat dump.",
          },
          {
            label: "Theme clusters",
            value: themeGroups.length,
            detail:
              "Cross-cutting themes expose how trust, docs, routing, wallets, and redesign work overlapped over time.",
          },
        ]}
      />

      <DocsSection
        eyebrow="WHY SEPARATE IT"
        title="Why plans live in a distinct archive lane"
        description="Archive material is valuable, but it should not be mistaken for current normative guidance."
      >
        <DocsDetailGrid
          items={[
            {
              eyebrow: "SIGNAL",
              title: "Live docs stay cleaner",
              description:
                "New readers should reach current product, methodology, and operator guidance before design history.",
            },
            {
              eyebrow: "TRACEABILITY",
              title: "History stays visible",
              description:
                "Plans remain useful for rollout archaeology, regressions, and understanding why later structures look the way they do.",
            },
            {
              eyebrow: "WEBIFIED",
              title: "Archive no longer means raw markdown links",
              description:
                "Each plan now has a canonical web page that summarizes the goal and links back into the current docs graph.",
            },
            {
              eyebrow: "BOUNDARY",
              title: "Normative docs stay separate from planning history",
              description:
                "The split makes it obvious when a page is current guidance versus historical implementation intent.",
            },
          ]}
        />
      </DocsSection>

      <DocsSection
        eyebrow="CHRONOLOGY"
        title="Archive chronology"
        description="Read the archive in historical order when you want to understand how the current product, docs, and orchestration system took shape."
      >
        <div className="space-y-5">
          {chronologyGroups.map((group) => (
            <div key={group.label} className="space-y-3">
              <div className="border-b-2 border-[#0a0a0a] pb-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                  DATE GROUP
                </div>
                <div className="mt-1 font-display text-[1.6rem] uppercase leading-none text-[#0a0a0a]">
                  {group.label}
                </div>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                {group.pages.map((page) => (
                  <DocsPageCard
                    key={page.id}
                    href={page.route}
                    eyebrow={page.heroEyebrow}
                    title={page.title}
                    description={page.summary}
                    meta={`ORDER::${page.order}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection
        eyebrow="THEMES"
        title="Theme clusters"
        description="Theme clusters make it easier to trace recurring design pressure across plans without confusing archive material for live guidance."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {themeGroups.map((group) => (
            <div
              key={group.theme}
              className="rounded-none border-2 border-[#0a0a0a] bg-white p-4"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                THEME CLUSTER
              </div>
              <div className="mt-2 font-display text-[1.35rem] uppercase leading-none text-[#0a0a0a]">
                {group.theme}
              </div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                {group.pages.length} related archive page{group.pages.length === 1 ? "" : "s"}
              </div>
              <div className="mt-3 space-y-2">
                {group.pages.map((page) => (
                  <DocsPageCard
                    key={`${group.theme}-${page.id}`}
                    href={page.route}
                    eyebrow="ARCHIVE LINK"
                    title={page.title}
                    description={page.summary}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection
        eyebrow="ARCHIVE PAGES"
        title="Plan library"
        description="These are the canonical archive pages for historical implementation plans and design sequences."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {archiveDocs.map((page) => (
            <DocsPageCard
              key={page.id}
              href={page.route}
              eyebrow={page.heroEyebrow}
              title={page.title}
              description={page.summary}
              meta={`LEGACY::${page.legacySourcePath?.split("/").pop() ?? "ARCHIVE"}`}
            />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        eyebrow="COMPATIBILITY EXPORTS"
        title="Machine-facing archive resources"
        description="The archive JSON and markdown indexes remain available for crawlers and legacy tooling even though the archive lane is now web-native."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {DOCS_CRAWLER_RESOURCES.filter(
            (resource) =>
              resource.href.includes("archive") ||
              resource.href.endsWith("llms.txt"),
          ).map((resource) => (
            <DocsTrackCard
              key={resource.href}
              href={resource.href}
              eyebrow="COMPAT"
              title={resource.label}
              description={resource.description}
            />
          ))}
        </div>
      </DocsSection>
    </>
  );
}
