import type { ReactNode } from "react";

export type HumanDocLane =
  | "product"
  | "methodology"
  | "reference"
  | "api"
  | "architecture"
  | "operators"
  | "runtime"
  | "archive";

export type HumanDocStatus = "primary" | "compatibility" | "archive";

export interface HumanDocAction {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
}

export interface HumanDocBridge {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
}

export interface HumanDocMatrix {
  caption?: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, ReactNode>>;
}

export interface HumanDocSection {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  paragraphs: string[];
  details?: Array<{ eyebrow: string; title: string; description: string }>;
  matrix?: HumanDocMatrix;
  flow?: Array<{ eyebrow: string; title: string; description: string }>;
  callout?: { eyebrow: string; title: string; body: string };
  bridges?: HumanDocBridge[];
}

export interface HumanDocCompatibilityLink {
  href: string;
  label: string;
  description: string;
}

export interface HumanDocPage {
  id: string;
  lane: HumanDocLane;
  route: string;
  slug: string;
  title: string;
  summary: string;
  audience: string;
  order: number;
  status: HumanDocStatus;
  legacySourcePath?: string;
  relatedRoutes: string[];
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  actions?: HumanDocAction[];
  rail: { eyebrow: string; title: string; body: string };
  sections: HumanDocSection[];
  compatibilityLinks?: HumanDocCompatibilityLink[];
}
