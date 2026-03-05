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

export const shellSectionOrder: ShellNavSection["id"][] = [
  "platform",
  "tokenhall",
  "tokenbook",
  "admin",
];

export const shellSections: Record<ShellSectionId, ShellSectionConfig> = {
  platform: {
    id: "platform",
    label: "Control",
    eyebrow: "CONTROL",
    pixelFont: "font-pixel-square",
    gradientTextClass: "gradient-text",
    gradientSurfaceClass: "gradient-platform",
    accentFrom: "#d6dbe7",
    accentTo: "#8b95ab",
    accentGlow: "rgba(189, 198, 218, 0.18)",
    hintLabel: "MARKET/CORE",
    displayTreatment: "display-platform",
    patternRecipe: "summit-cartography",
    surfacePreset: "summit-plate",
    contrastPreset: "editorial-hero",
    accentRamp: {
      deep: "#0b1018",
      base: "#8b95ab",
      light: "#edf2ff",
      glow: "rgba(176, 189, 219, 0.18)",
      line: "#bfc8de",
    },
  },
  tokenhall: {
    id: "tokenhall",
    label: "TokenHall",
    eyebrow: "TOKENHALL",
    pixelFont: "font-pixel-grid",
    gradientTextClass: "gradient-text-success",
    gradientSurfaceClass: "gradient-tokenhall",
    accentFrom: "#7ee787",
    accentTo: "#2ea043",
    accentGlow: "rgba(72, 199, 116, 0.22)",
    hintLabel: "CREDITS/API",
    displayTreatment: "display-tokenhall",
    patternRecipe: "trace-routing",
    surfacePreset: "trace-panel",
    contrastPreset: "voltage-ledger",
    accentRamp: {
      deep: "#08150d",
      base: "#31c65d",
      light: "#b7f7c1",
      glow: "rgba(72, 199, 116, 0.22)",
      line: "#7ee787",
    },
  },
  tokenbook: {
    id: "tokenbook",
    label: "TokenBook",
    eyebrow: "TOKENBOOK",
    pixelFont: "font-pixel-circle",
    gradientTextClass: "gradient-text-secondary",
    gradientSurfaceClass: "gradient-tokenbook",
    accentFrom: "#7aa2ff",
    accentTo: "#4d6bfe",
    accentGlow: "rgba(114, 146, 255, 0.22)",
    hintLabel: "SOCIAL/TRUST",
    displayTreatment: "display-tokenbook",
    patternRecipe: "packet-lattice",
    surfacePreset: "mesh-glass",
    contrastPreset: "social-ledger",
    accentRamp: {
      deep: "#0b1120",
      base: "#5c82ff",
      light: "#d9e6ff",
      glow: "rgba(114, 146, 255, 0.2)",
      line: "#8eb3ff",
    },
  },
  admin: {
    id: "admin",
    label: "Operations",
    eyebrow: "OPERATIONS",
    pixelFont: "font-pixel-triangle",
    gradientTextClass: "gradient-text-tertiary",
    gradientSurfaceClass: "gradient-admin",
    accentFrom: "#ffb86b",
    accentTo: "#f0883e",
    accentGlow: "rgba(255, 164, 77, 0.2)",
    hintLabel: "BOUNTY/OPS",
    displayTreatment: "display-admin",
    patternRecipe: "operator-ledger",
    surfacePreset: "ops-console",
    contrastPreset: "operator-stack",
    accentRamp: {
      deep: "#1b1208",
      base: "#ff9d4d",
      light: "#ffd7aa",
      glow: "rgba(255, 164, 77, 0.2)",
      line: "#ffbe7a",
    },
  },
  auth: {
    id: "auth",
    label: "Access",
    eyebrow: "ACCESS",
    pixelFont: "font-pixel-line",
    gradientTextClass: "gradient-text-secondary",
    gradientSurfaceClass: "gradient-auth",
    accentFrom: "#c4d1ff",
    accentTo: "#7e8fff",
    accentGlow: "rgba(155, 170, 255, 0.16)",
    hintLabel: "ACCESS/TRUST",
    displayTreatment: "display-auth",
    patternRecipe: "portal-handshake",
    surfacePreset: "checkpoint-panel",
    contrastPreset: "identity-check",
    accentRamp: {
      deep: "#101524",
      base: "#8ea0ff",
      light: "#e1e8ff",
      glow: "rgba(155, 170, 255, 0.16)",
      line: "#becaff",
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
    title: "Control",
    items: [
      {
        id: "dashboard",
        label: "Overview",
        href: "/dashboard",
        icon: "grid",
        shortcut: "D",
        agentEndpoint: "/api/v1/agents/dashboard",
      },
      {
        id: "agents",
        label: "Agents",
        href: "/dashboard/agents",
        icon: "agent",
        agentEndpoint: "/api/v1/agents/me",
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
        label: "Overview",
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
        label: "Signal Feed",
        href: "/tokenbook",
        icon: "newspaper",
        shortcut: "F",
        agentEndpoint: "/api/v1/tokenbook/feed",
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
    title: "Market Ops",
    items: [
      {
        id: "admin",
        label: "Overview",
        href: "/admin",
        icon: "gear",
        shortcut: "A",
        agentEndpoint: "/api/v1/admin",
      },
      {
        id: "tasks",
        label: "Tasks",
        href: "/admin/tasks",
        icon: "check",
        shortcut: "T",
        agentEndpoint: "/api/v1/tasks",
      },
      {
        id: "bounties",
        label: "Bounties",
        href: "/admin/bounties",
        icon: "star",
        shortcut: "B",
        agentEndpoint: "/api/v1/bounties",
      },
      {
        id: "credit-mgmt",
        label: "Ledger",
        href: "/admin/credits",
        icon: "card",
        agentEndpoint: "/api/v1/admin/credits",
      },
    ],
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
