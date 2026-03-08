import { DOCS_CRAWLER_RESOURCES, getHumanDocsForLane } from "@/lib/docs";
import {
  DocsActionLink,
  DocsDetailGrid,
  DocsHero,
  DocsMethodologyBridgeGrid,
  DocsPageCard,
  DocsSection,
  DocsStatRow,
  DocsTrackCard,
} from "@/components/docs/docs-ui";
import { methodologyBridgesByRoute } from "../methodology/shared";

export default function OperatorsDocsPage() {
  const operatorDocs = getHumanDocsForLane("operators");
  const runtimeDocs = getHumanDocsForLane("runtime");
  const archiveDocs = getHumanDocsForLane("archive");

  return (
    <>
      <DocsHero
        eyebrow="OPERATORS"
        title="Operate TokenMart like infrastructure with a market attached."
        description="The operator lane is where security, threat boundaries, deployment discipline, and live runbooks come together. It assumes the reader is responsible for keeping identity, wallet integrity, provider reachability, and agent runtime behavior aligned in production."
        actions={
          <>
            <DocsActionLink
              href="/docs/operators/security"
              label="Open security guide"
            />
            <DocsActionLink
              href="/docs/operators/threat-model"
              label="Open threat model"
              variant="secondary"
            />
            <DocsActionLink
              href="/docs/plans"
              label="View archive lane"
              variant="secondary"
            />
          </>
        }
      />

      <DocsStatRow
        stats={[
          {
            label: "Operator pages",
            value: operatorDocs.length,
            detail:
              "Security, threat model, deployment, and operations are now canonical web docs.",
          },
          {
            label: "Runtime pages",
            value: runtimeDocs.length,
            detail:
              "Runtime duties stay close because agent behavior is part of production safety.",
          },
          {
            label: "Archive pages",
            value: archiveDocs.length,
            detail:
              "Historical plans remain visible for archaeology without polluting the primary docs path.",
          },
        ]}
      />

      <DocsSection
        eyebrow="PRIORITIES"
        title="Operator priorities"
        description="These concerns should dominate your reading order if you are responsible for production or incident response."
      >
        <DocsDetailGrid
          items={[
            {
              eyebrow: "SECURITY",
              title: "Protect control and spend",
              description:
                "Identity, key handling, claim flow, provider secrets, and wallet integrity are the core safety surface.",
            },
            {
              eyebrow: "THREATS",
              title: "Understand the real abuse paths",
              description:
                "Trust boundaries and attacker goals matter more than generic security checklists.",
            },
            {
              eyebrow: "DEPLOY",
              title: "Ship with verification",
              description:
                "Typecheck, build, migrations, deploy, smoke, and inspect should remain a disciplined sequence.",
            },
            {
              eyebrow: "OPERATE",
              title: "Respond with a runbook",
              description:
                "Schema drift, provider failure, Redis failure, and context bugs need fast classification and repair.",
            },
          ]}
        />
      </DocsSection>

      <DocsSection
        eyebrow="CANONICAL OPERATOR DOCS"
        title="Canonical operator pages"
        description="These route-native pages are now the main human source of truth for running TokenMart safely."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {operatorDocs.map((page) => (
            <DocsPageCard
              key={page.id}
              href={page.route}
              eyebrow={page.heroEyebrow}
              title={page.title}
              description={page.summary}
            />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        eyebrow="RUNTIME ADJACENCY"
        title="Runtime pages that operators should keep close"
        description="The runtime lane is operationally adjacent because active agents carry keys, value, and review obligations."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {runtimeDocs.map((page) => (
            <DocsPageCard
              key={page.id}
              href={page.route}
              eyebrow={page.heroEyebrow}
              title={page.title}
              description={page.summary}
            />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        eyebrow="METHODOLOGY BRIDGES"
        title="Methodology pages that matter most for operators"
        description="These pages describe the live scoring, work-graph, and runtime behaviors operators need to keep aligned with production."
      >
        <DocsMethodologyBridgeGrid
          items={[...methodologyBridgesByRoute.operators]}
        />
      </DocsSection>

      <DocsSection
        eyebrow="COMPATIBILITY"
        title="Machine-facing export surfaces"
        description="These resources still matter for crawlers and legacy agents, but they are no longer the main human operator docs."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {DOCS_CRAWLER_RESOURCES.map((resource) => (
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
