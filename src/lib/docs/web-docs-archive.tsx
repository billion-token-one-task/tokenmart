import type { HumanDocPage } from "@/lib/docs/web-doc-types";

interface ArchiveSeed {
  slug: string;
  title: string;
  legacySourcePath: string;
  summary: string;
  goal: string;
  themes: string[];
  relatedRoutes: string[];
  order: number;
}

const archiveSeeds: ArchiveSeed[] = [
  {
    slug: "2026-03-05-comprehensive-backend-hardening",
    title: "Comprehensive Backend Hardening Implementation Plan",
    legacySourcePath:
      "docs/plans/2026-03-05-comprehensive-backend-hardening.md",
    summary:
      "Archive plan for backend hardening work across auth, routing, and persistence safety.",
    goal: "Tighten backend safety and correctness in the areas most likely to cause auth, schema, or integrity drift.",
    themes: ["backend hardening", "auth", "schema safety", "integrity"],
    relatedRoutes: [
      "/docs/operators/security",
      "/docs/architecture/system-architecture",
    ],
    order: 400,
  },
  {
    slug: "2026-03-05-release-readme-keys",
    title: "TokenMart Release + Docs + Web Key UX Implementation Plan",
    legacySourcePath: "docs/plans/2026-03-05-release-readme-keys.md",
    summary: "Archive plan for release readiness, docs, and key UX work.",
    goal: "Align release practice, documentation, and key-management UX so operators could ship safely and explain the system clearly.",
    themes: ["release readiness", "docs", "key UX"],
    relatedRoutes: [
      "/docs/operators/deployment",
      "/docs/operators/security",
      "/docs/reference/docs-index",
    ],
    order: 410,
  },
  {
    slug: "2026-03-05-tokenhall-prod-streaming-openrouter-model-catalog",
    title:
      "TokenHall Prod Streaming + OpenRouter Model Catalog Implementation Plan",
    legacySourcePath:
      "docs/plans/2026-03-05-tokenhall-prod-streaming-openrouter-model-catalog.md",
    summary: "Archive plan for streaming and model catalog work in TokenHall.",
    goal: "Expand TokenHall’s provider and streaming surface while keeping the OpenAI-compatible contract coherent.",
    themes: ["tokenhall", "streaming", "model catalog", "provider routing"],
    relatedRoutes: ["/docs/product/tokenhall", "/docs/api/api-overview"],
    order: 420,
  },
  {
    slug: "2026-03-05-wallet-transfer-and-agent-activity-maximalist",
    title:
      "TokenMart Wallet Transfer + Agent Activity Docs Implementation Plan",
    legacySourcePath:
      "docs/plans/2026-03-05-wallet-transfer-and-agent-activity-maximalist.md",
    summary:
      "Archive plan for wallet transfer and agent activity documentation work.",
    goal: "Make wallet movement and active-agent duty explicit enough to support operators and long-running runtimes.",
    themes: ["wallet transfers", "agent activity", "runtime docs"],
    relatedRoutes: [
      "/docs/product/credits-and-wallets",
      "/docs/runtime/heartbeat",
    ],
    order: 430,
  },
  {
    slug: "2026-03-06-tokenmart-rebrand-and-product-redesign",
    title: "TokenMart Rebrand And Product Redesign Implementation Plan",
    legacySourcePath:
      "docs/plans/2026-03-06-tokenmart-rebrand-and-product-redesign.md",
    summary: "Archive plan for the TokenMart product and design overhaul.",
    goal: "Reframe the product story and UI around a clearer market thesis and a stronger editorial identity.",
    themes: ["rebrand", "product redesign", "design system"],
    relatedRoutes: [
      "/docs/product/product-overview",
      "/docs/reference/docs-index",
    ],
    order: 440,
  },
  {
    slug: "2026-03-07-reference-video-editorial-overhaul-design",
    title: "Reference Video Editorial Overhaul Design",
    legacySourcePath:
      "docs/plans/2026-03-07-reference-video-editorial-overhaul-design.md",
    summary: "Archive design plan for the editorial overhaul of the site.",
    goal: "Choose and document the visual and editorial direction that later redesign work would apply across the site.",
    themes: ["editorial design", "visual direction", "brand system"],
    relatedRoutes: ["/docs/reference/docs-index", "/docs/product"],
    order: 450,
  },
  {
    slug: "2026-03-07-reference-video-editorial-overhaul-implementation",
    title: "Reference Video Editorial Overhaul Implementation Plan",
    legacySourcePath:
      "docs/plans/2026-03-07-reference-video-editorial-overhaul-implementation.md",
    summary:
      "Archive implementation plan for the editorial overhaul of the site.",
    goal: "Apply the approved editorial direction to shared primitives and major product surfaces in a systematic way.",
    themes: ["implementation", "shared primitives", "frontend overhaul"],
    relatedRoutes: [
      "/docs/reference/docs-index",
      "/docs/product",
      "/docs/operators",
    ],
    order: 460,
  },
  {
    slug: "2026-03-08-orchestration-audit-remediation",
    title: "Orchestration Audit Remediation Implementation Plan",
    legacySourcePath:
      "docs/plans/2026-03-08-orchestration-audit-remediation.md",
    summary:
      "Archive remediation plan for orchestration, trust, and work-graph alignment.",
    goal: "Align backend, APIs, docs, and frontend with the split trust model and the new work-graph methodology.",
    themes: ["orchestration", "audit", "remediation", "work graph"],
    relatedRoutes: [
      "/docs/methodology/orchestration-and-review",
      "/docs/architecture/agent-infrastructure",
    ],
    order: 470,
  },
  {
    slug: "2026-03-08-trust-orchestration-overhaul",
    title: "Trust and Orchestration Overhaul Implementation Plan",
    legacySourcePath: "docs/plans/2026-03-08-trust-orchestration-overhaul.md",
    summary:
      "Archive plan for the split service-health / market-trust / orchestration-capability model.",
    goal: "Replace the older heuristic-heavy daemon model with explicit service health, market trust, and orchestration capability contracts.",
    themes: ["trust overhaul", "service health", "orchestration capability"],
    relatedRoutes: [
      "/docs/methodology/trust-and-scoring",
      "/docs/methodology/orchestration-methodology",
    ],
    order: 480,
  },
];

function toArchivePage(seed: ArchiveSeed): HumanDocPage {
  return {
    id: `archive-${seed.slug}`,
    lane: "archive",
    route: `/docs/plans/${seed.slug}`,
    slug: seed.slug,
    title: seed.title,
    summary: seed.summary,
    audience: "maintainers, reviewers, internal operators",
    order: seed.order,
    status: "archive",
    legacySourcePath: seed.legacySourcePath,
    relatedRoutes: seed.relatedRoutes,
    heroEyebrow: "ARCHIVE / IMPLEMENTATION PLAN",
    heroTitle: seed.title,
    heroDescription:
      "This archive page gives the plan a canonical web home, preserves the original goal, and links it back into the current documentation graph without treating it as live normative guidance.",
    actions: [
      { href: "/docs/plans", label: "Back to archive lane" },
      ...(seed.relatedRoutes[0]
        ? [
            {
              href: seed.relatedRoutes[0],
              label: "Open related live docs",
              variant: "secondary" as const,
            },
          ]
        : []),
    ],
    rail: {
      eyebrow: "ARCHIVE STATUS",
      title: "Historical design intent, not current constitutional guidance.",
      body: "Archive pages are useful for implementation archaeology and product history, but the live methodology, operator, and runtime lanes are the current normative references.",
    },
    sections: [
      {
        id: "goal",
        eyebrow: "ORIGINAL GOAL",
        title: "What this plan was trying to change",
        description:
          "Each archive entry should still explain the original problem it was solving.",
        paragraphs: [
          seed.goal,
          "The value of keeping this plan visible is that later maintainers can still understand the intended shape of the work, even if the final implementation diverged in details.",
        ],
      },
      {
        id: "themes",
        eyebrow: "THEMES",
        title: "The plan’s main themes still map to live documentation areas.",
        description:
          "Archive pages are most useful when they point back into the canonical web docs instead of trapping readers in dead history.",
        paragraphs: [
          "The plan clustered around a few recurring themes that were important at the time and still help modern readers understand which parts of the system were under change pressure.",
        ],
        details: seed.themes.map((theme, index) => ({
          eyebrow: `THEME ${index + 1}`,
          title: theme,
          description:
            "A recurring concern that shaped the original implementation sequence and tradeoffs.",
        })),
        bridges: seed.relatedRoutes.map((route, index) => ({
          href: route,
          eyebrow: `LIVE ${index + 1}`,
          title: "Related current docs",
          description: `Use ${route} for the current canonical explanation of the area this plan affected.`,
        })),
      },
      {
        id: "why-archived",
        eyebrow: "WHY ARCHIVED",
        title:
          "The archive lane exists so design history stays visible without polluting the primary reading path.",
        description:
          "This is where planning artifacts belong once the live documentation system has absorbed the normative explanation.",
        paragraphs: [
          "Keeping this plan in the archive preserves traceability and context for future audits, regressions, and historical questions. It also makes it easier to explain why current docs and current code look the way they do.",
          "The important discipline is not to treat the archive as a substitute for the live docs. The archive explains what earlier implementers intended. The web-native documentation lanes explain the current system.",
        ],
      },
    ],
  };
}

export const archiveHumanDocs: HumanDocPage[] = archiveSeeds.map(toArchivePage);
