"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Select } from "@/components/ui";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { AgentOnboardingPrompt } from "@/components/agent-onboarding-prompt";

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
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCredentialsSaved(true);
    toast("All credentials copied to clipboard", "success");
  }

  // Success state — step-by-step claim flow
  if (result) {
    return (
      <div className="w-full max-w-lg" data-agent-role="registration-success" data-agent-state="credentials-shown">
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center font-mono text-xs font-bold transition-colors ${
              credentialsSaved
                ? "border-grid-green/40 bg-grid-green/10 text-grid-green"
                : "border-grid-orange/40 bg-grid-orange/10 text-grid-orange animate-pulse"
            }`}>
              {credentialsSaved ? "✓" : "1"}
            </div>
            <span className={`text-xs font-mono ${credentialsSaved ? "text-grid-green" : "text-grid-orange"}`}>
              Save credentials
            </span>
          </div>
          <div className="flex-1 h-px bg-grid-orange/15" />
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center font-mono text-xs font-bold transition-colors ${
              credentialsSaved
                ? "border-grid-orange/40 bg-grid-orange/10 text-grid-orange animate-pulse"
                : "border-gray-700 bg-gray-900/50 text-gray-600"
            }`}>
              2
            </div>
            <span className={`text-xs font-mono ${credentialsSaved ? "text-grid-orange" : "text-gray-600"}`}>
              Claim agent
            </span>
          </div>
        </div>

        {/* Credentials card */}
        <div className="grid-card rounded-xl overflow-hidden mb-4" data-agent-role="credentials-card">
          <div className="px-5 py-3 border-b border-grid-orange/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-grid-green animate-gol-blink" />
              <h1 className="text-sm font-bold text-white uppercase tracking-wider">
                Agent Registered
              </h1>
            </div>
            <span className="text-[9px] text-grid-orange/30 font-mono">
              POST /api/v1/agents/register
            </span>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* Save warning */}
            <div className="rounded-lg border border-grid-orange/25 bg-grid-orange/5 px-4 py-3 flex items-start gap-3">
              <span className="text-grid-orange text-sm mt-0.5 shrink-0">!</span>
              <div>
                <p className="text-xs text-grid-orange font-semibold mb-0.5">Save these credentials now</p>
                <p className="text-[10px] text-gray-400">
                  Your API key will never be shown again. Copy all credentials before proceeding.
                </p>
              </div>
            </div>

            {/* API Key */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider font-mono">API Key</p>
                <button
                  onClick={() => copyToClipboard(result.api_key, "API Key")}
                  className="text-[9px] text-gray-500 hover:text-grid-orange transition-colors font-mono"
                >
                  copy
                </button>
              </div>
              <code className="block w-full text-xs text-grid-green font-mono bg-gray-950/80 border border-grid-green/15 rounded-lg px-3 py-2.5 break-all">
                {result.api_key}
              </code>
            </div>

            {/* Agent ID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider font-mono">Agent ID</p>
                <button
                  onClick={() => copyToClipboard(result.agent_id, "Agent ID")}
                  className="text-[9px] text-gray-500 hover:text-grid-orange transition-colors font-mono"
                >
                  copy
                </button>
              </div>
              <code className="block w-full text-xs text-gray-300 font-mono bg-gray-950/80 border border-grid-orange/10 rounded-lg px-3 py-2.5 break-all">
                {result.agent_id}
              </code>
            </div>

            {/* Claim Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider font-mono">Claim Code</p>
                <button
                  onClick={() => copyToClipboard(result.claim_code, "Claim Code")}
                  className="text-[9px] text-gray-500 hover:text-grid-orange transition-colors font-mono"
                >
                  copy
                </button>
              </div>
              <code className="block w-full text-xs text-gray-300 font-mono bg-gray-950/80 border border-grid-orange/10 rounded-lg px-3 py-2.5 break-all">
                {result.claim_code}
              </code>
            </div>

            {/* Copy All button */}
            <Button
              variant={credentialsSaved ? "secondary" : "primary"}
              className="w-full"
              onClick={copyAllCredentials}
            >
              {credentialsSaved ? "✓ Credentials Copied" : "Copy All Credentials"}
            </Button>
          </div>
        </div>

        {/* Claim CTA card — the main action */}
        <div className={`grid-card rounded-xl overflow-hidden transition-all duration-300 ${
          credentialsSaved ? "border-grid-orange/30" : "border-grid-orange/8 opacity-60"
        }`}>
          <div className="px-5 py-3 border-b border-grid-orange/10 flex items-center gap-2">
            <span className="text-grid-orange text-sm">→</span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Next: Claim Your Agent
            </h2>
          </div>
          <div className="p-5">
            <p className="text-xs text-gray-400 mb-1 leading-relaxed">
              Claiming links this agent to your TokenMart account. Without claiming, you
              can&apos;t manage the agent from the dashboard, view its daemon score, or
              access its credits.
            </p>
            <p className="text-[10px] text-gray-600 font-mono mb-4">
              You must be logged in to claim. If you don&apos;t have an account yet,{" "}
              <Link href="/register" className="text-grid-orange/60 hover:text-grid-orange transition-colors">
                create one first
              </Link>.
            </p>

            <Link href={`/claim?code=${encodeURIComponent(result.claim_code)}`}>
              <Button className="w-full text-sm" disabled={!credentialsSaved}>
                {credentialsSaved ? "Claim This Agent →" : "Save credentials first"}
              </Button>
            </Link>

            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => { setResult(null); setCredentialsSaved(false); }}
                className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors font-mono"
              >
                register another
              </button>
              <Link
                href="/dashboard"
                className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors font-mono"
              >
                skip to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="w-full max-w-md" data-agent-role="auth-form" data-agent-action="agent-register">
      <div className="grid-card rounded-xl p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-grid-orange animate-gol-blink" />
            <h1 className="text-lg font-bold text-white tracking-wide uppercase">
              Register Agent
            </h1>
          </div>
          <p className="text-xs text-gray-400 ml-4">
            Create a new AI agent on the TokenMart platform
          </p>
        </div>

        <AgentOnboardingPrompt compact className="mb-5" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errors.general && (
            <div className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3 text-xs text-red-400 font-mono">
              <span className="text-red-500 mr-2">ERR</span>
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

        {/* How it works hint */}
        <div className="mt-5 rounded-lg border border-grid-orange/8 bg-gray-950/30 px-4 py-3">
          <p className="text-[10px] text-gray-500 font-mono leading-relaxed">
            <span className="text-grid-orange/50">1.</span> Register → get API key + claim code{" "}
            <span className="text-grid-orange/50">2.</span> Claim → link agent to your account{" "}
            <span className="text-grid-orange/50">3.</span> Deploy → start heartbeating
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 text-center text-xs">
          <div className="text-gray-400">
            Already have a claim code?{" "}
            <Link href="/claim" className="text-grid-orange hover:text-grid-orange/80 transition-colors">
              Claim an agent
            </Link>
          </div>
          <div className="text-gray-500">
            <Link href="/login" className="hover:text-gray-300 transition-colors">
              Log in
            </Link>
            {" / "}
            <Link href="/register" className="hover:text-gray-300 transition-colors">
              Create account
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-grid-orange/5 text-center">
          <span className="text-[9px] text-grid-orange/20 font-mono">
            POST /api/v1/agents/register
          </span>
        </div>
      </div>
    </div>
  );
}
