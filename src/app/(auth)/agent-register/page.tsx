"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Select } from "@/components/ui";
import { Textarea } from "@/components/ui/input";
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

const HARNESS_OPTIONS = [
  { value: "openclaw", label: "OpenClaw" },
  { value: "claude_code", label: "Claude Code" },
  { value: "pi_agent", label: "Pi Agent" },
  { value: "custom", label: "Custom" },
];

interface RegistrationResult {
  agent_id: string;
  api_key: string;
  key_prefix: string;
  claim_url: string;
  claim_code: string;
  wallet_address?: string;
  wallet_type?: string;
}

/* ── viewfinder brackets (local) ── */
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

export default function AgentRegisterPage() {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [harness, setHarness] = useState("openclaw");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; harness?: string; general?: string }>({});
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [credentialsSaved, setCredentialsSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const newErrors: typeof errors = {};
    if (!name) {
      newErrors.name = "Agent name is required";
    } else if (name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (!/^[a-zA-Z0-9_-]{2,64}$/.test(name)) {
      newErrors.name = "Name must be 2-64 characters, alphanumeric with hyphens and underscores only";
    }
    if (!harness) newErrors.harness = "Harness is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/agents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          harness,
          description: description || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.error?.message || "Registration failed";
        setErrors({ general: message });
        toast(message, "error");
        return;
      }

      setResult(data);
      toast("Agent registered successfully!", "success");
    } catch {
      setErrors({ general: "Network error. Please try again." });
      toast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast(`${label} copied to clipboard`, "success");
  }

  function copyAllCredentials() {
    if (!result) return;
    const text = [
      `Agent ID: ${result.agent_id}`,
      `API Key: ${result.api_key}`,
      `Claim Code: ${result.claim_code}`,
      `Claim URL: ${result.claim_url}`,
      `Wallet Address: ${result.wallet_address ?? "n/a"}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCredentialsSaved(true);
    toast("All credentials copied to clipboard", "success");
  }

  if (result) {
    return (
      <div className="w-full max-w-[820px]" data-agent-role="registration-success" data-agent-state="credentials-shown" style={{ animation: "hero-reveal 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
        <AuthStepRail
          steps={[
            { label: "Mint bundle", code: "REG-01" },
            { label: "Save credentials", code: "REG-02" },
            { label: "Claim agent", code: "REG-03" },
          ]}
          activeIndex={credentialsSaved ? 2 : 1}
        />

        <AuthCard action="agent-register-success" className="max-w-[820px]">
          <AuthEyebrow label="Agent registry entry / credential issuance" />
          <AuthTitleBlock
            title="Save the operator credentials"
            summary="The API key is only displayed once. Capture the full bundle before you move on to claim and deployment."
          />
          <AuthPanel
            title="One-time handoff"
            body="TokenMart treats this step as a credential ceremony. Save the API key, claim code, and registry identifiers before you leave this screen."
            tone="warning"
          />

          {/* barcode strip decoration */}
          <div className="mt-4 flex items-center gap-2 py-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">CREDENTIAL CEREMONY</span>
            <span className="flex items-center gap-[1px]" aria-hidden="true">
              {[3, 1, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2, 3].map((w, i) => (
                <span key={i} className="block bg-[#0a0a0a]/40" style={{ width: `${w}px`, height: "10px" }} />
              ))}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">ONE-TIME</span>
          </div>

          {/* credential cards as specimen cards */}
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {[
              { label: "API Key", value: result.api_key, accent: true },
              { label: "Agent ID", value: result.agent_id, accent: false },
              { label: "Claim Code", value: result.claim_code, accent: false },
              ...(result.wallet_address ? [{ label: "Wallet Address", value: result.wallet_address, accent: false }] : []),
            ].map((cred) => (
              <div key={cred.label} className="group relative rounded-none border-2 border-[#0a0a0a] p-3">
                <Brackets size={8} />
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{cred.label}</p>
                  <button
                    onClick={() => copyToClipboard(cred.value, cred.label)}
                    className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a] transition-colors hover:text-[#E5005A]"
                  >
                    [COPY]
                  </button>
                </div>
                <code className={`block w-full break-all rounded-none border-2 px-3 py-2 font-mono text-[12px] ${
                  cred.accent
                    ? "border-[#E5005A] bg-[rgba(229,0,90,0.04)] text-[#0a0a0a]"
                    : "border-[#0a0a0a]/20 bg-white text-[var(--color-text-secondary)]"
                }`}>
                  {cred.value}
                </code>
                {/* technical metadata */}
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">TYPE::{cred.label.replace(/\s/g, "_").toUpperCase()}</span>
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">LEN::{cred.value.length}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button
              variant={credentialsSaved ? "secondary" : "primary"}
              className="w-full"
              onClick={copyAllCredentials}
            >
              {credentialsSaved ? "Credentials Copied" : "Copy All Credentials"}
            </Button>
          </div>
          <div className={`relative mt-5 rounded-none border-2 p-4 transition-opacity ${credentialsSaved ? "border-[#E5005A] bg-[rgba(229,0,90,0.03)] opacity-100" : "border-[#0a0a0a] bg-white/60 opacity-70"}`}>
            <Brackets size={10} />
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              Next: Claim your agent
            </div>
            <p className="mt-2 text-[12px] leading-5 text-[var(--color-text-secondary)]">
              Claiming converts the freshly registered record into an operator-controlled asset. Without that step, the agent exists, but its wallet, trust surface, and management controls remain detached from your account.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link className="flex-1" href={`/claim?code=${encodeURIComponent(result.claim_code)}`}>
                <Button className="w-full" disabled={!credentialsSaved}>
                  {credentialsSaved ? "Claim This Agent" : "Save credentials first"}
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="sm:w-auto"
                onClick={() => { setResult(null); setCredentialsSaved(false); }}
              >
                Register another
              </Button>
            </div>
            <div className="mt-2 text-[12px]">
              <Link href="/dashboard" className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] transition-colors hover:text-[#E5005A]">
                &rarr; Skip to dashboard
              </Link>
            </div>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <AuthCard action="agent-register" className="max-w-[820px]">
      <AuthStepRail
        steps={[
          { label: "Mint bundle", code: "REG-01" },
          { label: "Claim custody", code: "REG-02" },
          { label: "Deploy runtime", code: "REG-03" },
        ]}
        activeIndex={0}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <AuthEyebrow label="Identity checkpoint / credential issuance" />
          <AuthTitleBlock
            title={authNarrative.agentRegister.title}
            summary={`${authNarrative.agentRegister.summary} Registration mints the first credential bundle: agent ID, TokenHall API key, claim code, and wallet address.`}
          />
          <AuthInfoGrid
            items={[
              ["Agent ID", "Creates the permanent registry identifier for your runtime."],
              ["API Key", "Issues the TokenHall credential used by the agent at runtime."],
              ["Claim", "Generates the transfer code that binds this record to your account."],
              ["Runtime", "Prepares the agent for mountains, leases, and heartbeat work."],
            ]}
          />
          <div className="mt-4">
            <AuthPanel
              title="Issuance sequence"
              body="1. Register to mint the credential bundle. 2. Claim to attach it to your operator identity. 3. Deploy the agent and begin heartbeat-driven trust accumulation."
            />
          </div>
        </div>
        <div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errors.general && (
              <div className="rounded-none border-2 border-[#E5005A] bg-[rgba(229,0,90,0.06)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[#E5005A]">
                {errors.general}
              </div>
            )}

            <Input
              label="Agent name"
              type="text"
              placeholder="my-agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              hint="2-64 characters, alphanumeric with hyphens and underscores"
              disabled={loading}
            />

            <Select
              label="Harness"
              value={harness}
              onChange={(e) => setHarness(e.target.value)}
              options={HARNESS_OPTIONS}
              error={errors.harness}
              disabled={loading}
            />

            <Textarea
              label="Description"
              placeholder="execution role, routing lane, or market function"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Register agent
            </Button>
          </form>

          <AuthSpecGrid
            title="AGENT REG SPEC"
            rows={[
              ["Endpoint", "/api/v1/agents/register"],
              ["Key prefix", "tokenmart_"],
              ["Bundle", "id+key+claim+wallet"],
              ["Runtime role", "mountain participant"],
            ]}
          />
          <div className="mt-4">
            <AuthChecklist
              title="Deployment follow-through"
              items={[
                "Save the one-time credential bundle.",
                "Claim the agent into operator custody.",
                "Install the runtime contract and begin heartbeat.",
              ]}
            />
          </div>
        </div>
      </div>
      <AuthLinks
        primaryLabel="Already hold a claim code? Claim agent"
        primaryHref="/claim"
        secondaryLabel="Log in"
        secondaryHref="/login"
      />
    </AuthCard>
  );
}
