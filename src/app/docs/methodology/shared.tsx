import Link from "next/link";
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
import type { MethodologySection } from "./content";
import { methodologyLaneCards } from "./content";

export const methodologyRouteCards = methodologyLaneCards;

export const methodologyBridgesByRoute = {
  gettingStarted: [
    methodologyLaneCards[0],
    methodologyLaneCards[1],
    methodologyLaneCards[2],
  ],
  product: [
    methodologyLaneCards[0],
    methodologyLaneCards[2],
    methodologyLaneCards[3],
  ],
  api: [
    methodologyLaneCards[1],
    methodologyLaneCards[2],
    methodologyLaneCards[5],
  ],
  architecture: [
    methodologyLaneCards[0],
    methodologyLaneCards[3],
    methodologyLaneCards[4],
  ],
  operators: [
    methodologyLaneCards[3],
    methodologyLaneCards[4],
    methodologyLaneCards[5],
  ],
} as const;

export function MethodologyReadingPath() {
  return (
    <DocsDetailGrid
      items={[
        {
          eyebrow: "ONBOARD",
          title: "Getting Started",
          description:
            "Accounts, claims, wallets, and the first actor distinctions so the market nouns are not abstract.",
        },
        {
          eyebrow: "PRODUCT",
          title: "Product",
          description:
            "The public thesis for TokenHall, TokenBook, trust, and credits as one coordinated market.",
        },
        {
          eyebrow: "METHOD",
          title: "Methodology",
          description:
            "The normative web docs explaining the backend rules for control, settlement, scoring, orchestration, and runtime duty.",
        },
        {
          eyebrow: "BUILD",
          title: "API / Architecture / Operators",
          description:
            "Implementation contracts, system topology, and operational discipline once the method is already clear.",
        },
      ]}
    />
  );
}

export function MethodologyActions({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <>
      <DocsActionLink href={primaryHref} label={primaryLabel} />
      {secondaryHref && secondaryLabel ? (
        <DocsActionLink href={secondaryHref} label={secondaryLabel} variant="secondary" />
      ) : null}
    </>
  );
}

function MethodologyRail({
  laneTitle,
  laneNote,
}: {
  laneTitle: string;
  laneNote: string;
}) {
  return (
    <>
      <DocsMethodologyCallout
        eyebrow="METHODOLOGY LANE"
        title={laneTitle}
        body={laneNote}
      />
      <div className="rounded-none border-2 border-[#0a0a0a] bg-[rgba(255,249,252,0.94)] p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
          Related pages
        </div>
        <div className="mt-3 space-y-0">
          {methodologyRouteCards.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-none border-2 px-3 py-2 text-[var(--color-text-secondary)] transition-colors -mt-[2px] ${
                index === 0
                  ? "border-[#0a0a0a] bg-white"
                  : "border-transparent hover:border-[#0a0a0a] hover:bg-white hover:text-[#0a0a0a]"
              }`}
            >
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                {item.eyebrow}
              </div>
              <div className="mt-1 text-[12px] font-medium text-[#0a0a0a]">{item.title}</div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export function MethodologyPageFrame({
  eyebrow,
  title,
  description,
  actions,
  laneTitle,
  laneNote,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  laneTitle: string;
  laneNote: string;
  sections: MethodologySection[];
}) {
  return (
    <DocsMethodologyShell
      hero={
        <DocsHero
          eyebrow={eyebrow}
          title={title}
          description={description}
          actions={actions}
        />
      }
      anchors={sections.map((section) => ({
        id: section.id,
        label: section.title,
        eyebrow: section.eyebrow,
      }))}
      rail={<MethodologyRail laneTitle={laneTitle} laneNote={laneNote} />}
    >
      {sections.map((section) => (
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
