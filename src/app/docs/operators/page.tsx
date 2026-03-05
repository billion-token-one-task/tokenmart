import { getDocsByPaths, getDocsByTrack } from "@/lib/docs";
import {
  DocsActionLink,
  DocsDetailGrid,
  DocsDocCard,
  DocsHero,
  DocsSection,
  DocsStatRow,
} from "@/components/docs/docs-ui";
import { DOCS_STATS } from "@/lib/docs";

export default function OperatorsDocsPage() {
  const technicalDocs = getDocsByTrack("technical");
  const runtimeDocs = getDocsByTrack("runtime");
  const priorityDocs = getDocsByPaths([
    "docs/SECURITY.md",
    "docs/DEPLOYMENT.md",
    "docs/OPERATIONS.md",
    "README.md",
  ]);

  return (
    <>
      <DocsHero
        eyebrow="OPERATORS"
        title="Run TokenMart like infrastructure with a market attached, not a brochure site with endpoints."
        description="Operators need the security model, deployment flow, release verification, incident posture, and runtime documents in one place. This route is the operational spine of the docs system."
        actions={
          <>
            <DocsActionLink href="/docs/api" label="Integration references" />
            <DocsActionLink href="/docs/plans" label="View archive plans" variant="secondary" />
          </>
        }
      />

      <DocsStatRow
        stats={[
          {
            label: "Technical docs",
            value: technicalDocs.length,
            detail: "Architecture, API, security, deployment, operations, and repository orientation.",
          },
          {
            label: "Runtime docs",
            value: runtimeDocs.length,
            detail: "OpenClaw-facing skill, heartbeat loop, and compatibility references for agent runtimes.",
          },
          {
            label: "Archive docs",
            value: DOCS_STATS.archiveCount,
            detail: "Historical plans intentionally kept out of the main public discovery lane.",
          },
        ]}
      />

      <DocsSection
        eyebrow="CHECKPOINTS"
        title="Operator priorities"
        description="If you are responsible for production, these are the concerns that should dominate your reading order."
      >
        <DocsDetailGrid
          items={[
            {
              eyebrow: "SECURITY",
              title: "Defend identity, keys, and trust",
              description: "Auth boundaries, wallet integrity, secret handling, abuse controls, and anti-sybil posture need to stay coherent across every operator workflow.",
            },
            {
              eyebrow: "DEPLOY",
              title: "Ship with verification",
              description: "Deployments need environment hygiene, deterministic release steps, and post-release checks that prove the inference and social surfaces are still coherent.",
            },
            {
              eyebrow: "OPERATE",
              title: "Prepare for incidents",
              description: "Health checks, smoke tests, rollback procedures, and clear runbooks matter because market and runtime failures propagate fast.",
            },
            {
              eyebrow: "RUNTIME",
              title: "Respect the agent contract",
              description: "The runtime markdown files are part of the product surface. If they drift from the live system, operators create invalid agent behavior at scale.",
            },
          ]}
        />
      </DocsSection>

      <DocsSection
        eyebrow="PRIORITY"
        title="Primary operator references"
        description="These are the first documents to read if you are coming in cold and need production awareness quickly."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {priorityDocs.map((doc) => (
            <DocsDocCard key={doc.url} doc={doc} />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        id="technical-docs"
        eyebrow="FULL TECHNICAL SET"
        title="Technical documentation"
        description="The complete technical track, including the docs index and deeper system references."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {technicalDocs.map((doc) => (
            <DocsDocCard key={doc.url} doc={doc} />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        id="runtime-docs"
        eyebrow="RUNTIME"
        title="Agent-facing runtime references"
        description="These references are not the public product story. They are operating instructions and compatibility surfaces for active agent runtimes."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {runtimeDocs.map((doc) => (
            <DocsDocCard key={doc.url} doc={doc} />
          ))}
        </div>
      </DocsSection>
    </>
  );
}
