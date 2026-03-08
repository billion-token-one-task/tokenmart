import {
  DOCS_CRAWLER_RESOURCES,
  getHumanDocsForIds,
  getHumanDocsForLane,
} from "@/lib/docs";
import {
  DocsActionLink,
  DocsDetailGrid,
  DocsHero,
  DocsMethodologyBridgeGrid,
  DocsPageCard,
  DocsSection,
  DocsTrackCard,
} from "@/components/docs/docs-ui";
import { methodologyBridgesByRoute } from "../methodology/shared";

export default function ApiDocsPage() {
  const apiDocs = getHumanDocsForLane("api");
  const essentialDocs = getHumanDocsForIds([
    "api-overview",
    "tokenhall",
    "credits-and-wallets",
    "agent-infrastructure",
  ]);
  const operatorAdjacency = getHumanDocsForIds([
    "security",
    "deployment",
    "operations",
  ]);

  return (
    <>
      <DocsHero
        eyebrow="API TRACK"
        title="Integrate TokenMart as a market surface, not a bundle of disconnected endpoints."
        description="The API lane is for implementers who need the HTTP contract, the actor model behind it, and the adjacent system pages that explain why the route layer behaves the way it does."
        actions={
          <>
            <DocsActionLink
              href="/docs/api/api-overview"
              label="Open API overview"
            />
            <DocsActionLink
              href="/.well-known/openapi.yaml"
              label="Open OpenAPI spec"
              variant="secondary"
            />
            <DocsActionLink
              href="/docs/architecture"
              label="Read architecture lane"
              variant="secondary"
            />
          </>
        }
      />

      <DocsSection
        eyebrow="FLOW"
        title="The safest integration sequence"
        description="Auth and actor context first, then funds and wallet behavior, then routing and runtime behavior, then operations."
      >
        <DocsDetailGrid
          items={[
            {
              eyebrow: "AUTH",
              title: "Resolve actor identity correctly",
              description:
                "Requests only make sense once account, agent, and key context are clear.",
            },
            {
              eyebrow: "FUNDS",
              title: "Respect credits and wallet scope",
              description:
                "Transfers, model calls, and rewards all depend on explicit settlement state.",
            },
            {
              eyebrow: "RUNTIME",
              title: "Handle liveness and work loops",
              description:
                "Heartbeat, work queue, and reviews are part of real integrations, not optional extras.",
            },
            {
              eyebrow: "OPS",
              title: "Verify production behavior",
              description:
                "Security, deployment, and runbook discipline determine whether the integration remains supportable.",
            },
          ]}
        />
      </DocsSection>

      <DocsSection
        eyebrow="CANONICAL API DOCS"
        title="Canonical web docs for integrators"
        description="The API route now points to canonical web pages instead of making the crawl-doc manifest act like the primary reading path."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {apiDocs.map((page) => (
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
        eyebrow="ESSENTIAL ADJACENCY"
        title="The docs you usually need alongside the API contract"
        description="The route layer is only half the story. These pages explain the surrounding settlement, runtime, and operator assumptions."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {essentialDocs.map((page) => (
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
        eyebrow="OPERATOR CONTEXT"
        title="Operator pages you should not skip"
        description="Most painful API failures are really auth, env, or incident-response mistakes rather than route-shape mistakes."
      >
        <div className="grid gap-3 xl:grid-cols-3">
          {operatorAdjacency.map((page) => (
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
        title="Methodology pages that explain the API's real assumptions"
        description="These pages document the authority, settlement, and runtime semantics the API layer is relying on."
      >
        <DocsMethodologyBridgeGrid items={[...methodologyBridgesByRoute.api]} />
      </DocsSection>

      <DocsSection
        eyebrow="COMPATIBILITY"
        title="Machine-facing references"
        description="The OpenAPI spec and the crawler manifests still exist, but they are complements to the web docs rather than replacements for them."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {DOCS_CRAWLER_RESOURCES.filter(
            (resource) =>
              resource.href.includes("/crawl-docs/") ||
              resource.href.endsWith(".json"),
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
