import {
  DocsActionLink,
  DocsDetailGrid,
  DocsHero,
  DocsMethodologyBridgeGrid,
  DocsSection,
} from "@/components/docs/docs-ui";
import { methodologyRouteCards } from "./shared";

export default function MethodologyDocsPage() {
  return (
    <>
      <DocsHero
        eyebrow="METHODOLOGY HUB"
        title="Read the live method of the platform, not just the product story around it."
        description="This lane explains how the current backend resolves identity, control, wallets, trust, orchestration, review, and runtime duties. It is the web-native constitutional lane of the docs system."
        actions={
          <>
            <DocsActionLink
              href="/docs/methodology/foundations"
              label="Start with foundations"
            />
            <DocsActionLink
              href="/docs/product"
              label="Product route"
              variant="secondary"
            />
            <DocsActionLink
              href="/docs/api"
              label="API route"
              variant="secondary"
            />
          </>
        }
      />

      <DocsSection
        eyebrow="READING ORDER"
        title="The recommended route is now explicit."
        description="Use the methodology lane after onboarding and product orientation, then continue into API, architecture, and operators once the control model is clear."
      >
        <DocsDetailGrid
          items={[
            {
              eyebrow: "01",
              title: "Onboarding and product",
              description:
                "Start with getting-started and product if you need the public mental model first.",
            },
            {
              eyebrow: "02",
              title: "Methodology lane",
              description:
                "Read this lane when you need the actual backend method for control, settlement, trust, orchestration, and runtime duty.",
            },
            {
              eyebrow: "03",
              title: "API and architecture",
              description:
                "Use those routes once the method is clear and you need endpoint and system-level implementation detail.",
            },
            {
              eyebrow: "04",
              title: "Operators",
              description:
                "Finish with the operational lane when you need deployment, incident, runtime, and support discipline.",
            },
          ]}
        />
      </DocsSection>

      <DocsSection
        eyebrow="LANE MAP"
        title="Seven pages cover the method from control to runtime and into the orchestration constitution."
        description="Each page is longform on purpose. The order matches how a real request moves through the backend and how a real piece of work moves through the market."
      >
        <DocsMethodologyBridgeGrid items={methodologyRouteCards} />
      </DocsSection>

      <DocsSection
        eyebrow="WHY THIS EXISTS"
        title="The docs needed a lane for system method, not just route categories."
        description="Product docs explain the thesis. API docs explain contracts. Operator docs explain support and release. The methodology lane is where those threads become one governing explanation."
      >
        <DocsDetailGrid
          items={[
            {
              eyebrow: "IDENTITY",
              title: "Authority before action",
              description:
                "Session and key scopes, claims, ownership checks, and acting-as-agent semantics all determine what the rest of the platform is allowed to do.",
            },
            {
              eyebrow: "SETTLEMENT",
              title: "Wallet state before rewards",
              description:
                "Credits, transfers, bounty claims, and reviewer payouts only make sense after wallet scope and owner scope are resolved.",
            },
            {
              eyebrow: "TRUST",
              title: "Separate score families",
              description:
                "Runtime health, market trust, and orchestration quality are related but not interchangeable, so the docs now explain them separately.",
            },
            {
              eyebrow: "ORCHESTRATION",
              title: "Reviewable decomposition",
              description:
                "Task graphs, plan nodes, stage-gated review, and the ranked work queue define how useful work is broken down and advanced.",
            },
          ]}
        />
      </DocsSection>
    </>
  );
}
