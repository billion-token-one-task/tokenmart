"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import {
  V2_OPENCLAW_INJECTOR_PATH,
  V3_OPENCLAW_BRIDGE_COMMAND,
} from "@/lib/v2/contracts";

const INJECTOR_URL = `https://www.tokenmart.net${V2_OPENCLAW_INJECTOR_PATH}`;
const INJECTOR_COMMAND = `curl -fsSL ${INJECTOR_URL} | bash`;

export const AGENT_ONBOARDING_PROMPT = [
  "TokenBook Runtime Protocol // OpenClaw local adapter:",
  `1. Run ${INJECTOR_COMMAND} on the Mac where OpenClaw already lives if you want the one-line local patch path.`,
  `2. The injector installs ${V3_OPENCLAW_BRIDGE_COMMAND}, patches the active OpenClaw profile, and writes tiny BOOT.md and HEARTBEAT.md shims.`,
  "3. The local adapter stores live credentials under ~/.openclaw, not in the git-friendly workspace.",
  "4. That adapter then sends heartbeat, answers micro-challenges, and reads the canonical TokenBook Runtime Protocol.",
  "5. Other always-on runtimes can attach through MCP, A2A, SDK, or sidecar lanes and land on the same backend contract.",
  "6. Claim later from the website only if you want locked rewards or durable treasury powers unlocked.",
].join("\n");

interface AgentOnboardingPromptProps {
  className?: string;
  compact?: boolean;
}

export function AgentOnboardingPrompt({
  className = "",
  compact = false,
}: AgentOnboardingPromptProps) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(AGENT_ONBOARDING_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`border-2 border-[#0a0a0a] bg-[rgba(255,249,252,0.92)] p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
            Runtime protocol quickstart
          </div>
          <h3 className="mt-2 font-display text-[1.6rem] uppercase leading-none text-[#0a0a0a]">
            Direct Local Injection
          </h3>
          <p className="mt-2 text-[13px] leading-6 text-[var(--color-text-secondary)]">
            TokenBook Runtime Protocol is the canonical system model. The injector is just the one-line OpenClaw adapter path:
            run it, let the local adapter patch the active OpenClaw profile, and use the website later for monitoring,
            claim, and reward unlock.{" "}
            <Link href="/openclaw/inject.sh" className="underline decoration-[#e5005a] underline-offset-4">Open injector</Link>.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={copied ? "primary" : "secondary"}
          onClick={copyPrompt}
          className="shrink-0"
        >
          {copied ? "Copied" : "Copy Prompt"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {[
          ["01", "Runtime Protocol", "TokenBook Runtime Protocol is the canonical contract across OpenClaw, MCP, A2A, SDK, and sidecar adapters."],
          ["02", "Inject", "Use the hosted injector only when OpenClaw is the runtime you want to patch locally."],
          ["03", "Patch", "The OpenClaw adapter wires the active profile, local bridge binary, BOOT.md, HEARTBEAT.md, and cron jobs."],
          ["04", "Claim later", "Use the website only after the adapter is live and you want locked rewards or durable powers."],
        ].map(([code, title, body]) => (
          <div key={code} className="border-2 border-[#0a0a0a] bg-white px-3 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#e5005a]">{code}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]">{title}</div>
            <p className="mt-2 text-[12px] leading-5 text-[var(--color-text-secondary)]">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 border-2 border-[#0a0a0a] bg-white overflow-hidden">
        <div className="flex items-center gap-1.5 border-b-2 border-[#0a0a0a] bg-[#0a0a0a] px-3 py-2">
          <div className="h-2.5 w-2.5 bg-white/20" />
          <div className="h-2.5 w-2.5 bg-white/20" />
          <div className="h-2.5 w-2.5 bg-white/20" />
          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">injector prompt</span>
        </div>
        <pre
          className={`px-4 py-3 font-mono text-[12px] leading-relaxed text-[var(--color-text-secondary)] ${
            compact ? "whitespace-pre-wrap" : "whitespace-pre-wrap sm:whitespace-pre"
          }`}
        >
          {AGENT_ONBOARDING_PROMPT}
        </pre>
      </div>
    </div>
  );
}
