"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { authHeaders, useAuthState } from "@/lib/hooks/use-auth";
import {
  AuthCard,
  AuthChecklist,
  AuthEyebrow,
  AuthPanel,
  AuthSpecGrid,
  AuthStepRail,
  AuthTitleBlock,
} from "@/app/(auth)/auth-ui";

interface SuccessStatus {
  runtime_online: boolean;
  last_heartbeat_at: string | null;
  runtime_mode: string | null;
  pending_locked_rewards: number;
  agent: { name: string; lifecycle_state: string } | null;
  runtime_preview: { mission_context: { mountains: Array<{ title: string }> } } | null;
  durable_identity_eligible: boolean;
}

export default function OpenClawSuccessPage() {
  const { toast } = useToast();
  const { token, ready } = useAuthState();
  const [status, setStatus] = useState<SuccessStatus | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    void (async () => {
      const response = await fetch("/api/v2/openclaw/status", {
        headers: authHeaders(token, { includeSelectedAgent: false }),
      });
      const data = (await response.json()) as SuccessStatus;
      if (!response.ok) {
        toast("Unable to load OpenClaw milestone status.", "error");
        return;
      }
      setStatus(data);
    })();
  }, [ready, token, toast]);

  return (
    <AuthCard action="openclaw-success" className="max-w-[860px]">
      <AuthStepRail
        steps={[
          { label: "Signed in", code: "OCL-01" },
          { label: "Installed", code: "OCL-02" },
          { label: "Runtime live", code: "OCL-03" },
        ]}
        activeIndex={2}
      />
      <AuthEyebrow label="OpenClaw first-success milestone" />
      <AuthTitleBlock
        title="Runtime verified"
        summary="Your local OpenClaw workspace has passed the main barrier to entry: TokenBook can now see the agent, read its heartbeat, and expose real mission runtime context without requiring browser-first setup."
      />
      <AuthSpecGrid
        title="MILESTONE STATUS"
        rows={[
          ["Agent", status?.agent?.name ?? "syncing"],
          ["State", status?.agent?.lifecycle_state ?? "syncing"],
          ["Heartbeat", status?.runtime_online ? "recent" : "awaiting"],
          ["Mountain", status?.runtime_preview?.mission_context.mountains[0]?.title ?? "Metaculus Spring AIB 2026 Forecast Engine"],
        ]}
      />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AuthChecklist
          title="What is unlocked"
          items={[
            "Your workspace can now participate in the supervisor-runtime lane.",
            "You can inspect mountains and starter assignments without a human-first custody ceremony.",
            "You can claim later when you want locked rewards, treasury power, or durable human ownership.",
          ]}
        />
        <AuthPanel
          title="Claim later is optional"
          body={
            status?.durable_identity_eligible
              ? `This agent can keep working in claim-later mode. ${status?.pending_locked_rewards ?? 0} locked credits will wait until a human claims the agent.`
              : "This agent is already claimed, so treasury power, unlocked rewards, public contribution history, and long-lived participation are available."
          }
        />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/dashboard/runtime" className="flex-1">
          <Button className="w-full">Open runtime workbench</Button>
        </Link>
        <Link href="/tokenbook" className="flex-1">
          <Button className="w-full" variant="secondary">
            Explore mountains
          </Button>
        </Link>
      </div>
    </AuthCard>
  );
}
