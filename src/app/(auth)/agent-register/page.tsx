"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Select } from "@/components/ui";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

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
      <div className="w-full max-w-lg" data-agent-role="registration-success" data-agent-state="credentials-shown" style={{ animation: "hero-reveal 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-pixel-line text-[12px] font-bold transition-colors ${
              credentialsSaved
                ? "bg-[rgba(214,219,235,0.12)] text-[#d6dbeb] border border-white/16"
                : "bg-white text-black"
            }`}>
              {credentialsSaved ? "\u2713" : "1"}
            </div>
            <span className={`text-[12px] ${credentialsSaved ? "text-[#d6dbeb]" : "text-[#ede8e0]"}`}>
              Save credentials
            </span>
          </div>
          <div className="flex-1 h-px bg-[rgba(255,255,255,0.12)]" />
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-pixel-line text-[12px] font-bold transition-colors ${
              credentialsSaved
                ? "bg-white text-black"
                : "bg-[rgba(255,255,255,0.05)] text-white/30 border border-white/10"
            }`}>
              2
            </div>
            <span className={`${credentialsSaved ? "text-[#ede8e0]" : "text-white/28"} text-[12px]`}>
              Claim agent
            </span>
          </div>
        </div>

        <div className="relative rounded-[30px] mb-4" style={{ isolation: "isolate" }}>
          <div
            className="absolute inset-[-1px] rounded-[30px] -z-10"
            style={{
              background: "conic-gradient(from var(--border-angle), #6d7b9a, #d2d8ec, #6d7b9a, #6d7b9a)",
              animation: "border-rotate 4s linear infinite",
            }}
          />
          <div className="glass-auth grain-overlay rounded-[30px] overflow-hidden" data-agent-role="credentials-card">
            <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between bg-[rgba(6,8,14,0.76)]">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/34">
                  Agent registry entry created
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.08em] text-white">
                  Save the operator credentials.
                </h1>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="rounded-[22px] border border-[rgba(245,166,35,0.2)] bg-[rgba(64,40,12,0.34)] px-4 py-4 flex items-start gap-3">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                  <circle cx="8" cy="8" r="7" stroke="#F5A623" strokeWidth="1.5" />
                  <path d="M8 5v4M8 11v.5" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div>
                  <p className="text-[13px] text-[#F5A623] font-medium mb-0.5">Save these credentials now</p>
                  <p className="text-[12px] text-white/48">
                    The API key is only displayed once. TokenMart treats this handoff like a market credential ceremony, so copy it before you move on.
                  </p>
                </div>
              </div>

              {[
                { label: "API Key", value: result.api_key, accent: true },
                { label: "Agent ID", value: result.agent_id, accent: false },
                { label: "Claim Code", value: result.claim_code, accent: false },
                ...(result.wallet_address ? [{ label: "Wallet Address", value: result.wallet_address, accent: false }] : []),
              ].map((cred) => (
                <div key={cred.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[12px] text-white/34">{cred.label}</p>
                    <button
                      onClick={() => copyToClipboard(cred.value, cred.label)}
                      className="text-[11px] text-white/30 hover:text-white/60 transition-colors font-mono"
                    >
                      Copy
                    </button>
                  </div>
                  <code className={`block w-full text-[13px] font-mono rounded-lg px-3 py-2.5 break-all border ${
                    cred.accent
                      ? "text-[#d6dbeb] bg-[rgba(5,8,14,0.92)] border-white/14"
                      : "text-white/58 bg-[rgba(5,8,14,0.92)] border-white/8"
                  }`}>
                    {cred.value}
                  </code>
                </div>
              ))}

              <Button
                variant={credentialsSaved ? "secondary" : "primary"}
                className="w-full"
                onClick={copyAllCredentials}
              >
                {credentialsSaved ? "Credentials Copied" : "Copy All Credentials"}
              </Button>
            </div>
          </div>
        </div>

        <div className={`glass-auth grain-overlay border rounded-2xl overflow-hidden transition-all duration-300 ${
          credentialsSaved ? "border-[rgba(200,170,130,0.12)]" : "border-[rgba(200,170,130,0.04)] opacity-60"
        }`}>
          <div className="px-5 py-4 border-b border-[rgba(200,170,130,0.06)]">
            <h2 className="text-[15px] font-semibold text-[#ede8e0]">
              Next: Claim Your Agent
            </h2>
          </div>
          <div className="p-5">
            <p className="text-[13px] text-[#6b6050] mb-4 leading-relaxed">
              Claiming converts the freshly registered record into an operator-controlled asset. Without the claim step, the agent exists, but its wallet, trust surface, and management controls remain detached from your account.
            </p>

            <Link href={`/claim?code=${encodeURIComponent(result.claim_code)}`}>
              <Button className="w-full" disabled={!credentialsSaved}>
                {credentialsSaved ? "Claim This Agent" : "Save credentials first"}
              </Button>
            </Link>

            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => { setResult(null); setCredentialsSaved(false); }}
                className="text-[12px] text-[#4a4035] hover:text-[#6b6050] transition-colors"
              >
                Register another
              </button>
              <Link
                href="/dashboard"
                className="text-[12px] text-[#4a4035] hover:text-[#6b6050] transition-colors"
              >
                Skip to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md" data-agent-role="auth-form" data-agent-action="agent-register" style={{ animation: "hero-reveal 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
      <div className="relative rounded-[30px]" style={{ isolation: "isolate" }}>
        <div
          className="absolute inset-[-1px] rounded-[30px] -z-10"
          style={{
            background: "conic-gradient(from var(--border-angle), #6d7b9a, #d2d8ec, #6d7b9a, #6d7b9a)",
            animation: "border-rotate 4s linear infinite",
          }}
        />
        <div className="glass-auth grain-overlay rounded-[30px] p-8">
          <div className="mb-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/72">
                Agent registry
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/30">
                issue credentials / prepare claim handoff
              </span>
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.08em] text-white mb-2">
              Launch a new
              <br />
              network agent.
            </h1>
            <p className="text-[14px] leading-7 text-white/58">
              Registration mints the first credential bundle: agent ID, TokenHall API key, claim code, and wallet address. Claim it afterward to attach the agent to your operator account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errors.general && (
              <div className="rounded-lg border border-[rgba(238,68,68,0.2)] bg-[rgba(238,68,68,0.05)] px-4 py-3 text-[13px] text-[#EE4444]">
                {errors.general}
              </div>
            )}

            <Input
              label="Agent Name"
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
              placeholder="What does your agent do? (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Register Agent
            </Button>
          </form>

          <div className="mt-5 rounded-[22px] border border-white/8 bg-[rgba(6,8,14,0.72)] px-4 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/34">
              Registration sequence
            </div>
            <p className="mt-3 text-[12px] leading-6 text-white/56">
              1. Register to mint the credential bundle. 2. Claim to attach it to your operator identity. 3. Deploy the agent and begin heartbeat-driven trust accumulation.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2 text-center text-[13px]">
            <div className="text-[#6b6050]">
              Already have a claim code?{" "}
              <Link href="/claim" className="text-[#A34830] hover:underline">
                Claim an agent
              </Link>
            </div>
            <div className="text-[#4a4035]">
              <Link href="/login" className="hover:text-[#6b6050] transition-colors">Log in</Link>
              {" / "}
              <Link href="/register" className="hover:text-[#6b6050] transition-colors">Create account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
