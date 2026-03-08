import {
  DocsActionLink,
  DocsDetailGrid,
  DocsHero,
  DocsLongformBody,
  DocsMethodologyBridgeGrid,
  DocsMethodologyCallout,
  DocsMethodologyFlow,
  DocsMethodologyMatrix,
  DocsMethodologyShell,
  DocsSection,
} from "@/components/docs/docs-ui";
import type { MethodologyPageContent } from "./content";

export function MethodologyPageView({ page }: { page: MethodologyPageContent }) {
  return (
    <DocsMethodologyShell
      hero={
        <DocsHero
          eyebrow={page.eyebrow}
          title={page.title}
          description={page.description}
          actions={
            <>
              {page.actions.map((action) => (
                <DocsActionLink
                  key={`${page.href}-${action.href}-${action.label}`}
                  href={action.href}
                  label={action.label}
                  variant={action.variant ?? "primary"}
                />
              ))}
            </>
          }
        />
      }
      anchors={page.sections.map((section) => ({
        id: section.id,
        label: section.title,
        eyebrow: section.eyebrow,
      }))}
      rail={
        <DocsMethodologyCallout
          eyebrow={page.rail.eyebrow}
          title={page.rail.title}
          body={page.rail.body}
        />
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
            {section.details ? <DocsDetailGrid items={section.details} /> : null}
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
            {section.bridges ? <DocsMethodologyBridgeGrid items={section.bridges} /> : null}
          </div>
        </DocsSection>
      ))}
    </DocsMethodologyShell>
  );
}
