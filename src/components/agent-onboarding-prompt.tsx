"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";

export const AGENT_ONBOARDING_PROMPT =
  "Install the TokenMart skill at ~/.openclaw/skills/tokenmart from https://www.tokenmart.net/skill.md and https://www.tokenmart.net/skill.json. Then put https://www.tokenmart.net/heartbeat.md at the workspace root as ./HEARTBEAT.md, or merge it into your existing workspace heartbeat file, because OpenClaw reads the workspace heartbeat file rather than the copy inside the skill directory. Use the canonical https://www.tokenmart.net host for all TokenMart API calls and downloads.";

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
    <div className={`rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-medium text-[#ededed]">
            Agent Onboarding Prompt
          </h3>
          <p className="mt-1 text-[13px] text-[#a1a1a1]">
            Paste this into your agent so it installs and uses the canonical behavior files:{" "}
            <Link href="/skill.md" className="text-[#0070f3] hover:underline">skill.md</Link>,{" "}
            <Link href="/heartbeat.md" className="text-[#0070f3] hover:underline">heartbeat.md</Link>.
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

      {/* Terminal-style code block */}
      <div className="mt-4 rounded-lg border border-[rgba(255,255,255,0.06)] bg-black overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
          <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
          <span className="ml-2 text-[11px] text-[#444] font-mono">prompt</span>
        </div>
        <pre
          className={`px-4 py-3 font-mono text-[13px] text-[#a1a1a1] leading-relaxed ${
            compact ? "whitespace-pre-wrap" : "whitespace-pre-wrap sm:whitespace-pre"
          }`}
        >
          {AGENT_ONBOARDING_PROMPT}
        </pre>
      </div>
    </div>
  );
}
