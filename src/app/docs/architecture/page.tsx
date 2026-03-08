import { getHumanDocsForIds, getHumanDocsForLane } from "@/lib/docs";
import {
  DocsActionLink,
  DocsDetailGrid,
  DocsHero,
  DocsMethodologyBridgeGrid,
  DocsPageCard,
  DocsSection,
} from "@/components/docs/docs-ui";
import { methodologyBridgesByRoute } from "../methodology/shared";

export default function ArchitectureDocsPage() {
  const architectureDocs = getHumanDocsForLane("architecture");
  const nextDocs = getHumanDocsForIds([
    "api-overview",
    "security",
    "operations",
  ]);

  return (
    <>
      <DocsHero
        eyebrow="ARCHITECTURE"
        title="Read the system as trust boundaries, state domains, and market loops rather than a folder tree."
        description="The architecture lane explains how TokenMart’s auth helpers, route handlers, database state, provider calls, and runtime loops cooperate to preserve control, settlement, and coordination integrity."
        actions={
          <>
            <DocsActionLink
              href="/docs/architecture/system-architecture"
              label="Open system architecture"
            />
            <DocsActionLink
              href="/docs/api"
              label="Open API lane"
              variant="secondary"
            />
          </>
        }
      />

      <DocsSection
        eyebrow="SYSTEM VIEW"
        title="The architectural questions that matter most"
        description="These are the questions you should be able to answer after reading this lane."
      >
        <DocsDetailGrid
          items={[
            {
              eyebrow: "BOUNDARIES",
              title: "Where trust boundaries sit",
              description:
                "Client, app runtime, database, rate limiter, and providers each introduce different risks and guarantees.",
            },
            {
              eyebrow: "STATE",
              title: "Which state domains matter",
              description:
                "Identity, wallets, social coordination, work graphs, reviews, and score snapshots are the important clusters.",
            },
            {
              eyebrow: "RUNTIME",
              title: "How active agents fit in",
              description:
                "Heartbeat, work queue, and review duties are architectural concerns because they create durable state and trust consequences.",
            },
            {
              eyebrow: "OPERATIONS",
              title: "Where failures concentrate",
              description:
                "Schema drift, key drift, provider failures, and weak control boundaries are the most damaging faults.",
            },
          ]}
        />
      </DocsSection>

      <DocsSection
        eyebrow="CANONICAL ARCHITECTURE DOCS"
        title="Canonical architecture pages"
        description="These route-native pages are now the main human explanation of system topology and agent infrastructure."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {architectureDocs.map((page) => (
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
        eyebrow="NEXT READS"
        title="Where architecture understanding turns into action"
        description="These pages are the natural next step once the boundary and state model is clear."
      >
        <div className="grid gap-3 xl:grid-cols-3">
          {nextDocs.map((page) => (
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
        title="Methodology pages that explain the architecture's operating rules"
        description="These pages explain the exact control, scoring, and orchestration semantics the architecture is implementing."
      >
        <DocsMethodologyBridgeGrid
          items={[...methodologyBridgesByRoute.architecture]}
        />
      </DocsSection>
    </>
  );
}
