import Link from "next/link";
import {
  DocsActionLink,
  DocsDetailGrid,
  DocsLongformBody,
  DocsMethodologyBridgeGrid,
  DocsMethodologyCallout,
  DocsMethodologyFlow,
  DocsMethodologyMatrix,
  DocsMethodologyShell,
  DocsPageCard,
  DocsPrevNextNav,
  DocsSection,
} from "@/components/docs/docs-ui";
import { getHumanDocsByCanonicalRoutes } from "@/lib/docs";
import type { HumanDocPage } from "@/lib/docs/web-doc-types";

export function DocsDetailPageView({
  page,
  previous,
  next,
}: {
  page: HumanDocPage;
  previous?: { href: string; eyebrow: string; title: string };
  next?: { href: string; eyebrow: string; title: string };
}) {
  const relatedDocs = getHumanDocsByCanonicalRoutes(page.relatedRoutes).filter(
    (relatedPage) => relatedPage.route !== page.route,
  );

  return (
    <DocsMethodologyShell
      hero={
        <section className="space-y-4">
          <div className="rounded-none border-2 border-[#0a0a0a] bg-white p-5 shadow-[4px_4px_0_#0a0a0a] sm:p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              {page.heroEyebrow}
            </div>
            <h1 className="mt-3 max-w-4xl font-display text-[clamp(2.2rem,4.8vw,4.6rem)] uppercase leading-[0.9] tracking-[0.01em] text-[#0a0a0a]">
              {page.heroTitle}
            </h1>
            <p className="mt-4 max-w-3xl text-[13px] leading-6 text-[var(--color-text-secondary)]">
              {page.heroDescription}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#0a0a0a]/10 pt-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                LANE::{page.lane.toUpperCase()}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                SURFACE::CANONICAL-WEB
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                STATUS::{page.status.toUpperCase()}
              </span>
            </div>
            {page.actions?.length ? (
              <div className="mt-5 flex flex-wrap gap-3">
                {page.actions.map((action) => (
                  <DocsActionLink
                    key={`${page.id}-${action.href}-${action.label}`}
                    href={action.href}
                    label={action.label}
                    variant={action.variant ?? "primary"}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <DocsPrevNextNav previous={previous} next={next} />
        </section>
      }
      anchors={page.sections.map((section) => ({
        id: section.id,
        label: section.title,
        eyebrow: section.eyebrow,
      }))}
      rail={
        <div className="space-y-4">
          <DocsMethodologyCallout
            eyebrow={page.rail.eyebrow}
            title={page.rail.title}
            body={page.rail.body}
          />
          <div className="rounded-none border-2 border-[#0a0a0a] bg-[rgba(255,249,252,0.94)] p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              Document metadata
            </div>
            <div className="mt-3 space-y-2 text-[12px] leading-5 text-[var(--color-text-secondary)]">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                  Audience
                </span>
                <div className="mt-1">{page.audience}</div>
              </div>
              {page.legacySourcePath ? (
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                    Legacy source
                  </span>
                  <div className="mt-1 break-all font-mono text-[11px] text-[var(--color-text-secondary)]">
                    {page.legacySourcePath}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          {page.compatibilityLinks?.length ? (
            <div className="rounded-none border-2 border-[#0a0a0a] bg-[rgba(255,249,252,0.94)] p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                Compatibility surfaces
              </div>
              <div className="mt-3 space-y-3">
                {page.compatibilityLinks.map((link) => (
                  <Link
                    key={`${page.id}-${link.href}`}
                    href={link.href}
                    className="group block rounded-none border-2 border-[#0a0a0a] bg-white px-3 py-2 transition-colors hover:bg-[#E5005A] hover:text-white"
                  >
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] group-hover:text-white/60">
                      Compatibility
                    </div>
                    <div className="mt-1 text-[12px] font-medium text-[#0a0a0a] group-hover:text-white">
                      {link.label}
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-secondary)] group-hover:text-white/80">
                      {link.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      }
    >
      {page.sections.map((section) => (
        <DocsSection
          key={section.id}
          id={section.id}
          eyebrow={section.eyebrow}
          title={section.title}
          description={section.description}
        >
          <div className="space-y-5">
            <DocsLongformBody paragraphs={section.paragraphs} />
            {section.details ? (
              <DocsDetailGrid items={section.details} />
            ) : null}
            {section.matrix ? (
              <DocsMethodologyMatrix
                caption={section.matrix.caption}
                columns={section.matrix.columns}
                rows={section.matrix.rows}
              />
            ) : null}
            {section.flow ? <DocsMethodologyFlow items={section.flow} /> : null}
            {section.callout ? (
              <DocsMethodologyCallout
                eyebrow={section.callout.eyebrow}
                title={section.callout.title}
                body={section.callout.body}
              />
            ) : null}
            {section.bridges ? (
              <DocsMethodologyBridgeGrid items={section.bridges} />
            ) : null}
          </div>
        </DocsSection>
      ))}
      {relatedDocs.length ? (
        <DocsSection
          eyebrow="RELATED ROUTES"
          title="Keep reading the current canonical graph"
          description="These route-native pages are the most relevant adjacent references for the document you are reading now."
        >
          <div className="grid gap-3 xl:grid-cols-2">
            {relatedDocs.map((relatedPage) => (
              <DocsPageCard
                key={`${page.id}-${relatedPage.id}`}
                href={relatedPage.route}
                eyebrow={relatedPage.heroEyebrow}
                title={relatedPage.title}
                description={relatedPage.summary}
                meta={`LANE::${relatedPage.lane.toUpperCase()}`}
              />
            ))}
          </div>
        </DocsSection>
      ) : null}
      <DocsSection
        eyebrow="CONTINUE"
        title="Keep moving through the web docs graph"
        description="Use the canonical next and previous links rather than the old markdown indexes."
      >
        <DocsPrevNextNav previous={previous} next={next} />
      </DocsSection>
    </DocsMethodologyShell>
  );
}
