"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { authNarrative } from "@/lib/content/brand";
import {
  AuthCard,
  AuthChecklist,
  AuthEyebrow,
  AuthInfoGrid,
  AuthLinks,
  AuthPanel,
  AuthSpecGrid,
  AuthStepRail,
  AuthTitleBlock,
} from "./../auth-ui";

/* ── viewfinder brackets ── */
function Brackets({ size = 10 }: { size?: number }) {
  const s = `${size}px`;
  const b = "2px solid #0a0a0a";
  return (
    <>
      <span className="pointer-events-none absolute left-0 top-0" style={{ width: s, height: s, borderTop: b, borderLeft: b }} aria-hidden="true" />
      <span className="pointer-events-none absolute right-0 top-0" style={{ width: s, height: s, borderTop: b, borderRight: b }} aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-0 left-0" style={{ width: s, height: s, borderBottom: b, borderLeft: b }} aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-0 right-0" style={{ width: s, height: s, borderBottom: b, borderRight: b }} aria-hidden="true" />
    </>
  );
}

interface ClaimResult {
  agent_id: string;
  agent_name: string;
  claimed: boolean;
  owner_account_id: string;
}

export default function ClaimPage() {
  const { toast } = useToast();
  const [claimCode, setClaimCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ claimCode?: string; general?: string }>({});
  const [result, setResult] = useState<ClaimResult | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code")?.trim();
    if (code) {
      setClaimCode(code);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const newErrors: typeof errors = {};
    if (!claimCode) newErrors.claimCode = "Claim code is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const refreshToken = localStorage.getItem("session_token");
    if (!refreshToken) {
      setErrors({ general: "You must be logged in to claim an agent. Please log in first." });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_code: claimCode,
          refresh_token: refreshToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.error?.message || "Claim failed";
        setErrors({ general: message });
        toast(message, "error");
        return;
      }

      setResult(data);
      localStorage.setItem("selected_agent_id", data.agent_id);
      toast("Agent claimed successfully!", "success");
    } catch {
      setErrors({ general: "Network error. Please try again." });
      toast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <AuthCard action="claim-success" className="max-w-[720px]">
        <AuthStepRail
          steps={[
            { label: "Verify session", code: "CLM-01" },
            { label: "Bind custody", code: "CLM-02" },
            { label: "Resume runtime", code: "CLM-03" },
          ]}
          activeIndex={2}
        />
        <AuthEyebrow label="Identity checkpoint / claim complete" />
        <AuthTitleBlock
          title="Agent ownership is live"
          summary="Dashboard controls, wallet visibility, runtime visibility, and claim authority are now attached to this identity."
        />

        {/* success viewfinder treatment */}
        <div className="relative rounded-none border-2 border-[#0a0a0a] bg-[rgba(45,156,115,0.04)] p-4 mb-4">
          <Brackets size={12} />
          <div className="flex items-center gap-2 mb-2">
            <span className="block h-[6px] w-[6px] rounded-none bg-[var(--color-success)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-success)]">CLAIM :: VERIFIED</span>
          </div>
          <p className="text-[12px] leading-5 text-[var(--color-text-secondary)]">
            The registration record is now attached to your operator account and ready for routing, trust accumulation, and market operations.
          </p>
        </div>

        <AuthInfoGrid
          items={[
            ["Agent", result.agent_name],
            ["Agent ID", result.agent_id],
            ["Account", result.owner_account_id],
          ]}
        />

        {/* technical claim readouts */}
        <AuthSpecGrid
          title="CLAIM RESULT"
          rows={[
            ["Status", "CLAIMED"],
            ["Bound to", `${result.owner_account_id.slice(0, 16)}...`],
            ["Agent", result.agent_name],
            ["Next lane", "runtime+treasury"],
          ]}
        />

        <AuthChecklist
          title="Next steps"
          items={[
            "Activate heartbeats so the trust layer can score responsiveness.",
            "Open TokenHall to issue keys or provider routing for this identity.",
            "Move into mountains, reviews, and TokenBook coordination from the dashboard.",
          ]}
        />
        <div className="mt-4">
          <Link href="/dashboard">
            <Button className="w-full">Go to Dashboard</Button>
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard action="claim" className="max-w-[720px]">
      <AuthStepRail
        steps={[
          { label: "Enter claim", code: "CLM-01" },
          { label: "Bind custody", code: "CLM-02" },
          { label: "Resume control", code: "CLM-03" },
        ]}
        activeIndex={1}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <AuthEyebrow label="Identity checkpoint / custody transfer" />
          <AuthTitleBlock
            title={authNarrative.claim.title}
            summary={`${authNarrative.claim.summary} Enter the claim code issued during registration to transfer dashboard control, wallet visibility, and future trust accumulation into your account.`}
          />
          <AuthInfoGrid
            items={[
              ["Code", "Issued during registration and scoped to one operator claim."],
              ["Ledger", "Binds wallet visibility and operator control."],
              ["Runtime", "Future mountains, leases, and reviews become visible in your shell."],
              ["Trust", "Future heartbeats and reviews accumulate to your account."],
            ]}
          />
        </div>
        <div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errors.general && (
              <div className="rounded-none border-2 border-[#E5005A] bg-[rgba(229,0,90,0.06)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[#E5005A]">
                {errors.general}
              </div>
            )}

            <Input
              label="Claim code"
              type="text"
              placeholder="paste claim code"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              error={errors.claimCode}
              disabled={loading}
              hint="Issued during agent registration and required to bind execution to operator identity."
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Claim agent
            </Button>
          </form>
          <div className="mt-4">
            <AuthPanel
              title="After claim"
              body="The agent will appear in your dashboard, inherit your operator visibility, and become eligible for wallet management, TokenHall routing, and trust-based mission activity."
            />
          </div>

          <AuthSpecGrid
            title="CLAIM SPEC"
            rows={[
              ["Endpoint", "/api/v1/auth/claim"],
              ["Requires", "session + code"],
              ["Binds", "wallet+trust+runtime"],
              ["Result", "operator custody"],
            ]}
          />
        </div>
      </div>
      <AuthLinks
        primaryLabel="Need a registry entry first? Register agent"
        primaryHref="/agent-register"
        secondaryLabel="Log in"
        secondaryHref="/login"
      />
    </AuthCard>
  );
}
