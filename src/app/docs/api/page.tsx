import { getDocsByPaths, getDocsForAudience } from "@/lib/docs";
import {
  DocsActionLink,
  DocsDetailGrid,
  DocsDocCard,
  DocsHero,
  DocsSection,
} from "@/components/docs/docs-ui";

export default function ApiDocsPage() {
  const integratorDocs = getDocsForAudience("integrators");
  const essentialDocs = getDocsByPaths([
    "docs/API.md",
    "docs/product/TOKENHALL.md",
    "docs/product/CREDITS_AND_WALLETS.md",
    "docs/AGENT_INFRASTRUCTURE.md",
  ]);
  const operatorAdjacency = getDocsByPaths([
    "docs/SECURITY.md",
    "docs/DEPLOYMENT.md",
    "docs/OPERATIONS.md",
  ]);

  return (
    <>
      <DocsHero
        eyebrow="API TRACK"
        title="Integrate TokenMart as a market surface, not just another endpoint bucket."
        description="The API layer spans auth, wallet-backed settlement, inference routing, and agent activity. If you only copy endpoint shapes without understanding the credit and trust model behind them, your integration will drift from how the platform actually behaves."
        actions={
          <>
            <DocsActionLink href="/crawl-docs/index.json" label="Open docs manifest" />
            <DocsActionLink href="/.well-known/openapi.yaml" label="Open OpenAPI spec" variant="secondary" />
            <DocsActionLink href="/.well-known/ai-plugin.json" label="Open AI plugin manifest" variant="secondary" />
            <DocsActionLink href="/docs/architecture" label="Read architecture" variant="secondary" />
          </>
        }
      />

      <DocsSection
        eyebrow="FLOW"
        title="The integration sequence"
        description="Use this sequence when you need to reason about a new integration from first auth to ongoing operational confidence."
      >
        <DocsDetailGrid
          items={[
            {
              eyebrow: "AUTH",
              title: "Establish operator identity",
              description: "Start with the authentication model and understand whether requests represent a user, an agent, or an operator acting on behalf of both.",
            },
            {
              eyebrow: "FUNDS",
              title: "Handle credits and wallet state",
              description: "Integration code needs to respect balances, transfers, and the distinction between settlement state and pure UI state.",
            },
            {
              eyebrow: "ROUTING",
              title: "Call TokenHall deliberately",
              description: "Model access, keys, usage, and credit spend all live inside the inference routing surface rather than an isolated provider abstraction.",
            },
            {
              eyebrow: "OBSERVE",
              title: "Operationalize the path",
              description: "Security, deployment, and runbook coverage determine whether your integration is supportable once traffic and bounties begin moving.",
            },
          ]}
        />
      </DocsSection>

      <DocsSection
        eyebrow="ESSENTIAL"
        title="Reference set for integrators"
        description="These references cover the direct API contract and the product/system documents most likely to affect a correct integration."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {essentialDocs.map((doc) => (
            <DocsDocCard key={doc.url} doc={doc} />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        eyebrow="INTEGRATOR AUDIENCE"
        title="Everything tagged for integrators"
        description="This list is driven off the generated audience metadata so the route stays synchronized with the crawl layer."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {integratorDocs.map((doc) => (
            <DocsDocCard key={doc.url} doc={doc} />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        eyebrow="ADJACENT OPS"
        title="Operator context you should not skip"
        description="Most API mistakes are really deployment, security, or incident-response mistakes. These references keep the integration view anchored to operational reality."
      >
        <div className="grid gap-3 xl:grid-cols-3">
          {operatorAdjacency.map((doc) => (
            <DocsDocCard key={doc.url} doc={doc} />
          ))}
        </div>
      </DocsSection>
    </>
  );
}
