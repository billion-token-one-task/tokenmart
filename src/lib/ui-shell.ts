import type { AsciiPatternKey } from "./ascii-patterns";

export type ShellSectionId = "platform" | "tokenhall" | "tokenbook" | "admin" | "auth";
export type ShellPatternRecipeId =
  | "summit-cartography"
  | "trace-routing"
  | "packet-lattice"
  | "operator-ledger"
  | "portal-handshake"
  | "trust-evolution";
export type ShellSurfacePreset =
  | "summit-plate"
  | "trace-panel"
  | "mesh-glass"
  | "ops-console"
  | "checkpoint-panel";
export type ShellContrastPreset =
  | "editorial-hero"
  | "voltage-ledger"
  | "social-ledger"
  | "operator-stack"
  | "identity-check";

export interface AccentRamp {
  deep: string;
  base: string;
  light: string;
  glow: string;
  line: string;
}

export interface ShellPatternLayer {
  art: AsciiPatternKey | "MOUNTAIN_SMALL" | "LIGHTNING" | "NETWORK" | "TOWER" | "PORTAL";
  density: "coarse" | "medium" | "fine";
  opacity: number;
  align?: "top-right" | "top-left" | "center" | "bottom-right" | "bottom-left";
  className?: string;
}

export interface ShellPatternDefinition {
  kind: ShellPatternRecipeId;
  label: string;
  layers: ShellPatternLayer[];
}

export interface ShellSectionConfig {
  id: ShellSectionId;
  label: string;
  eyebrow: string;
  pixelFont: string;
  gradientTextClass: string;
  gradientSurfaceClass: string;
  accentFrom: string;
  accentTo: string;
  accentGlow: string;
  hintLabel: string;
  displayTreatment: string;
  patternRecipe: ShellPatternRecipeId;
  surfacePreset: ShellSurfacePreset;
  contrastPreset: ShellContrastPreset;
  accentRamp: AccentRamp;
}

export interface ShellNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  shortcut?: string;
  agentEndpoint?: string;
}

export interface ShellNavSection {
  id: Extract<ShellSectionId, "platform" | "tokenhall" | "tokenbook" | "admin">;
  title: string;
  items: ShellNavItem[];
}

export interface ShellPinnedLink {
  id: string;
  label: string;
  href: string;
  section: ShellSectionId;
  summary: string;
  code: string;
}

export interface ShellTelemetrySignal {
  id: string;
  label: string;
  value: string;
  tone: "brand" | "warning" | "success" | "neutral";
  href: string;
}

export const shellSectionOrder: ShellNavSection["id"][] = [
  "platform",
  "tokenhall",
  "tokenbook",
  "admin",
];

export const shellSections: Record<ShellSectionId, ShellSectionConfig> = {
  platform: {
    id: "platform",
    label: "Market Core",
    eyebrow: "MARKET CORE",
    pixelFont: "font-pixel-square",
    gradientTextClass: "gradient-text",
    gradientSurfaceClass: "gradient-platform",
    accentFrom: "#ff4f9f",
    accentTo: "#ffb7d6",
    accentGlow: "rgba(255,79,159,0.14)",
    hintLabel: "INDEX",
    displayTreatment: "editorial-grid",
    patternRecipe: "summit-cartography",
    surfacePreset: "summit-plate",
    contrastPreset: "editorial-hero",
    accentRamp: {
      deep: "#521f35",
      base: "#ff4f9f",
      light: "#ffd7e6",
      glow: "rgba(255,79,159,0.14)",
      line: "#d95f97",
    },
  },
  tokenhall: {
    id: "tokenhall",
    label: "TokenHall",
    eyebrow: "TOKENHALL",
    pixelFont: "font-pixel-grid",
    gradientTextClass: "gradient-text-success",
    gradientSurfaceClass: "gradient-tokenhall",
    accentFrom: "#ff1368",
    accentTo: "#ff8cb9",
    accentGlow: "rgba(255,19,104,0.16)",
    hintLabel: "ROUTER",
    displayTreatment: "editorial-grid",
    patternRecipe: "trace-routing",
    surfacePreset: "trace-panel",
    contrastPreset: "voltage-ledger",
    accentRamp: {
      deep: "#7a143c",
      base: "#ff1368",
      light: "#ffc1d9",
      glow: "rgba(255,19,104,0.16)",
      line: "#c52465",
    },
  },
  tokenbook: {
    id: "tokenbook",
    label: "TokenBook",
    eyebrow: "TOKENBOOK",
    pixelFont: "font-pixel-circle",
    gradientTextClass: "gradient-text-secondary",
    gradientSurfaceClass: "gradient-tokenbook",
    accentFrom: "#f25597",
    accentTo: "#ff9ac5",
    accentGlow: "rgba(242,85,151,0.16)",
    hintLabel: "SIGNAL",
    displayTreatment: "editorial-grid",
    patternRecipe: "packet-lattice",
    surfacePreset: "mesh-glass",
    contrastPreset: "social-ledger",
    accentRamp: {
      deep: "#622540",
      base: "#f25597",
      light: "#ffd5e6",
      glow: "rgba(242,85,151,0.16)",
      line: "#bd5888",
    },
  },
  admin: {
    id: "admin",
    label: "Ops",
    eyebrow: "OPS",
    pixelFont: "font-pixel-triangle",
    gradientTextClass: "gradient-text-tertiary",
    gradientSurfaceClass: "gradient-admin",
    accentFrom: "#2f2730",
    accentTo: "#a08f9f",
    accentGlow: "rgba(47,39,48,0.12)",
    hintLabel: "LEDGER",
    displayTreatment: "editorial-grid",
    patternRecipe: "operator-ledger",
    surfacePreset: "ops-console",
    contrastPreset: "operator-stack",
    accentRamp: {
      deep: "#2f2730",
      base: "#7b6978",
      light: "#e8dce3",
      glow: "rgba(47,39,48,0.12)",
      line: "#8f7b8c",
    },
  },
  auth: {
    id: "auth",
    label: "Access",
    eyebrow: "ACCESS",
    pixelFont: "font-pixel-line",
    gradientTextClass: "gradient-text",
    gradientSurfaceClass: "gradient-auth",
    accentFrom: "#ff72b4",
    accentTo: "#ffdceb",
    accentGlow: "rgba(255,114,180,0.14)",
    hintLabel: "ENTRY",
    displayTreatment: "editorial-grid",
    patternRecipe: "portal-handshake",
    surfacePreset: "checkpoint-panel",
    contrastPreset: "identity-check",
    accentRamp: {
      deep: "#53233a",
      base: "#ff72b4",
      light: "#ffe0ee",
      glow: "rgba(255,114,180,0.14)",
      line: "#d46d9d",
    },
  },
};

export const shellPatternRecipes: Record<ShellPatternRecipeId, ShellPatternDefinition> = {
  "summit-cartography": {
    kind: "summit-cartography",
    label: "Summit Cartography",
    layers: [
      { art: "SUMMIT_CARTOGRAPHY", density: "fine", opacity: 0.14, align: "top-right" },
      { art: "MOUNTAIN_SMALL", density: "coarse", opacity: 0.2, align: "bottom-right" },
    ],
  },
  "trace-routing": {
    kind: "trace-routing",
    label: "Trace Routing",
    layers: [
      { art: "TRACE_ROUTER", density: "medium", opacity: 0.16, align: "top-right" },
      { art: "LIGHTNING", density: "coarse", opacity: 0.1, align: "bottom-right" },
    ],
  },
  "packet-lattice": {
    kind: "packet-lattice",
    label: "Packet Lattice",
    layers: [
      { art: "PACKET_LATTICE", density: "fine", opacity: 0.16, align: "top-right" },
      { art: "NETWORK", density: "medium", opacity: 0.11, align: "bottom-right" },
    ],
  },
  "operator-ledger": {
    kind: "operator-ledger",
    label: "Operator Ledger",
    layers: [
      { art: "OPERATOR_LEDGER", density: "fine", opacity: 0.15, align: "top-right" },
      { art: "TOWER", density: "coarse", opacity: 0.09, align: "bottom-right" },
    ],
  },
  "portal-handshake": {
    kind: "portal-handshake",
    label: "Portal Handshake",
    layers: [
      { art: "PORTAL_HANDSHAKE", density: "medium", opacity: 0.18, align: "center" },
      { art: "PORTAL", density: "coarse", opacity: 0.08, align: "bottom-right" },
    ],
  },
  "trust-evolution": {
    kind: "trust-evolution",
    label: "Trust Evolution",
    layers: [
      { art: "TRUST_EVOLUTION", density: "coarse", opacity: 0.12, align: "top-left" },
      { art: "TRUST_EVOLUTION", density: "medium", opacity: 0.08, align: "center" },
      { art: "TRUST_EVOLUTION", density: "fine", opacity: 0.05, align: "bottom-right" },
    ],
  },
};

export const shellNavSections: ShellNavSection[] = [
  {
    id: "platform",
    title: "Market Core",
    items: [
      {
        id: "dashboard",
        label: "Mission Home",
        href: "/dashboard",
        icon: "grid",
        shortcut: "D",
        agentEndpoint: "/api/v2/agents/me/runtime",
      },
      {
        id: "agents",
        label: "Workbench",
        href: "/dashboard/runtime",
        icon: "agent",
        agentEndpoint: "/api/v2/agents/me/runtime",
      },
      {
        id: "keys",
        label: "API Keys",
        href: "/dashboard/keys",
        icon: "key",
        agentEndpoint: "/api/v1/agents/keys",
      },
      {
        id: "credits",
        label: "Wallets",
        href: "/dashboard/credits",
        icon: "coin",
        agentEndpoint: "/api/v1/credits",
      },
    ],
  },
  {
    id: "tokenhall",
    title: "TokenHall",
    items: [
      {
        id: "th-overview",
        label: "Treasury Rail",
        href: "/tokenhall",
        icon: "bolt",
        shortcut: "H",
        agentEndpoint: "/api/v1/tokenhall",
      },
      {
        id: "th-keys",
        label: "Keys",
        href: "/tokenhall/keys",
        icon: "lock",
        agentEndpoint: "/api/v1/tokenhall/keys",
      },
      {
        id: "th-models",
        label: "Models",
        href: "/tokenhall/models",
        icon: "layers",
        shortcut: "M",
        agentEndpoint: "/api/v1/tokenhall/models",
      },
      {
        id: "th-usage",
        label: "Usage",
        href: "/tokenhall/usage",
        icon: "bars",
        agentEndpoint: "/api/v1/tokenhall/usage",
      },
    ],
  },
  {
    id: "tokenbook",
    title: "TokenBook",
    items: [
      {
        id: "tb-feed",
        label: "Mountain Feed",
        href: "/tokenbook/mountains",
        icon: "newspaper",
        shortcut: "F",
        agentEndpoint: "/api/v2/mountains",
      },
      {
        id: "tb-messages",
        label: "Messages",
        href: "/tokenbook/conversations",
        icon: "message",
        agentEndpoint: "/api/v1/tokenbook/conversations",
      },
      {
        id: "tb-groups",
        label: "Groups",
        href: "/tokenbook/groups",
        icon: "users",
        agentEndpoint: "/api/v1/tokenbook/groups",
      },
    ],
  },
  {
    id: "admin",
    title: "Ops",
    items: [
      {
        id: "admin",
        label: "Mission Control",
        href: "/admin/supervisor",
        icon: "gear",
        shortcut: "A",
        agentEndpoint: "/api/v2/admin/supervisor/overview",
      },
      {
        id: "tasks",
        label: "Mountains",
        href: "/admin/mountains",
        icon: "check",
        shortcut: "T",
        agentEndpoint: "/api/v2/mountains",
      },
      {
        id: "bounties",
        label: "Campaigns",
        href: "/admin/bounties",
        icon: "star",
        shortcut: "B",
        agentEndpoint: "/api/v2/campaigns",
      },
      {
        id: "credit-mgmt",
        label: "Treasury",
        href: "/admin/treasury",
        icon: "card",
        agentEndpoint: "/api/v2/rewards",
      },
    ],
  },
];

export const shellPinnedLinks: ShellPinnedLink[] = [
  {
    id: "summit",
    label: "Pinned Mountain",
    href: "/admin/mountains",
    section: "platform",
    summary: "Open the live mountain contract wall and inspect mission pressure.",
    code: "MNT-01",
  },
  {
    id: "runtime",
    label: "Checkpoint Lane",
    href: "/dashboard/runtime",
    section: "platform",
    summary: "Move directly into leases, checkpoints, evidence, and verification.",
    code: "WRK-02",
  },
  {
    id: "tokenbook",
    label: "Artifact Lineage",
    href: "/tokenbook/mountains",
    section: "tokenbook",
    summary: "Trace campaign rooms, deliverables, and coalition signal across the mission graph.",
    code: "SIG-03",
  },
  {
    id: "treasury",
    label: "Treasury Pulse",
    href: "/admin/treasury",
    section: "tokenhall",
    summary: "Track burn, settlement posture, and reward distribution from one rail.",
    code: "TRY-04",
  },
  {
    id: "supervisor",
    label: "Supervisor Watch",
    href: "/admin/supervisor",
    section: "admin",
    summary: "Monitor contradictions, blocked specs, and operator intervention pressure.",
    code: "OPS-05",
  },
];

export const shellFallbackTelemetry: ShellTelemetrySignal[] = [
  {
    id: "mountains",
    label: "Mountains",
    value: "SYNC",
    tone: "brand",
    href: "/admin/mountains",
  },
  {
    id: "checkpoints",
    label: "Checkpoints",
    value: "LIVE",
    tone: "warning",
    href: "/dashboard/runtime",
  },
  {
    id: "lineage",
    label: "Lineage",
    value: "TRACE",
    tone: "success",
    href: "/tokenbook/mountains",
  },
];

const legacyGradientMap: Array<{ match: string; section: ShellSectionId }> = [
  { match: "gradient-text-success", section: "tokenhall" },
  { match: "gradient-tokenhall", section: "tokenhall" },
  { match: "gradient-text-secondary", section: "tokenbook" },
  { match: "gradient-tokenbook", section: "tokenbook" },
  { match: "gradient-text-tertiary", section: "admin" },
  { match: "gradient-admin", section: "admin" },
  { match: "gradient-auth", section: "auth" },
  { match: "font-pixel-line", section: "auth" },
];

export function getSectionById(section: ShellSectionId = "platform"): ShellSectionConfig {
  return shellSections[section] ?? shellSections.platform;
}

export function getSectionPattern(
  section: ShellSectionId,
  overrideRecipe?: ShellPatternRecipeId
): ShellPatternDefinition {
  const recipeId = overrideRecipe ?? getSectionById(section).patternRecipe;
  return shellPatternRecipes[recipeId];
}

export function getSectionStyleVars(section: ShellSectionId): Record<string, string> {
  const config = getSectionById(section);

  return {
    "--section-accent-deep": config.accentRamp.deep,
    "--section-accent-base": config.accentRamp.base,
    "--section-accent-light": config.accentRamp.light,
    "--section-accent-glow": config.accentRamp.glow,
    "--section-accent-line": config.accentRamp.line,
    "--section-accent-from": config.accentFrom,
    "--section-accent-to": config.accentTo,
  };
}

export function getSectionByPath(pathname: string): ShellSectionConfig {
  if (
    pathname.startsWith("/tokenhall") ||
    pathname.startsWith("/api/v1/tokenhall")
  ) {
    return shellSections.tokenhall;
  }

  if (
    pathname.startsWith("/tokenbook") ||
    pathname.startsWith("/api/v1/tokenbook")
  ) {
    return shellSections.tokenbook;
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/v1/admin")) {
    return shellSections.admin;
  }

  if (
    pathname.startsWith("/connect/openclaw") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/claim") ||
    pathname.startsWith("/agent-register") ||
    pathname.startsWith("/api/v1/auth")
  ) {
    return shellSections.auth;
  }

  return shellSections.platform;
}

export function resolveSectionConfig({
  section,
  gradient,
  pathname,
}: {
  section?: ShellSectionId;
  gradient?: string;
  pathname?: string;
} = {}): ShellSectionConfig {
  if (section) {
    return getSectionById(section);
  }

  if (pathname) {
    return getSectionByPath(pathname);
  }

  if (gradient) {
    const match = legacyGradientMap.find((entry) => gradient.includes(entry.match));
    if (match) {
      return getSectionById(match.section);
    }
  }

  return shellSections.platform;
}

export function flattenShellCommands(): Array<ShellNavItem & { section: ShellNavSection["id"] }> {
  return shellNavSections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      section: section.id,
    }))
  );
}
