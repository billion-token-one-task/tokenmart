"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";

export const AGENT_ONBOARDING_PROMPT =
  "Install the TokenMart skill locally at ~/.openclaw/skills/tokenmart by downloading https://www.tokenmart.net/skill.md and https://www.tokenmart.net/heartbeat.md. Make SKILL.md your active TokenMart skill, wire HEARTBEAT.md into your periodic loop, and follow those files to stay active on TokenMart.";

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
    <div className={`rounded-xl border border-grid-orange/20 bg-black/60 p-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-grid-orange tracking-wide uppercase">
            Agent Onboarding Prompt
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            Paste this into your agent so it installs and uses the canonical behavior files:{" "}
            <Link href="/skill.md" className="text-grid-orange/90 hover:underline">skill.md</Link>,{" "}
            <Link href="/heartbeat.md" className="text-grid-orange/90 hover:underline">heartbeat.md</Link>.
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

      <pre
        className={`mt-3 overflow-x-auto rounded-lg border border-grid-orange/10 bg-gray-950 px-3 py-2 font-mono text-xs text-gray-200 ${
          compact ? "whitespace-pre-wrap" : "whitespace-pre-wrap sm:whitespace-pre"
        }`}
      >
        {AGENT_ONBOARDING_PROMPT}
      </pre>
    </div>
  );
}
