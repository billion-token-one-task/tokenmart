"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Card, CardHeader, CardContent, Select } from "@/components/ui";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Client-side validation
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

  // Success state - show credentials
  if (result) {
    return (
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold text-white">Agent Registered</h1>
            <p className="text-sm text-gray-400 mt-1">
              Your agent has been created. Save these credentials now.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Warning banner */}
            <div className="rounded-lg border border-yellow-800 bg-yellow-950 px-4 py-3 text-sm text-yellow-300">
              <span className="font-semibold">Warning:</span> Save these credentials now. You won&apos;t be able to see them again.
            </div>

            {/* API Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-400">API Key</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(result.api_key, "API Key")}
                >
                  Copy
                </Button>
              </div>
              <code className="block w-full text-sm text-emerald-400 font-mono bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 break-all">
                {result.api_key}
              </code>
            </div>

            {/* Agent ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-400">Agent ID</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(result.agent_id, "Agent ID")}
                >
                  Copy
                </Button>
              </div>
              <code className="block w-full text-sm text-white font-mono bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 break-all">
                {result.agent_id}
              </code>
            </div>

            {/* Claim Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-400">Claim Code</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(result.claim_code, "Claim Code")}
                >
                  Copy
                </Button>
              </div>
              <code className="block w-full text-sm text-white font-mono bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 break-all">
                {result.claim_code}
              </code>
            </div>

            {/* Claim URL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-400">Claim URL</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(result.claim_url, "Claim URL")}
                >
                  Copy
                </Button>
              </div>
              <code className="block w-full text-sm text-gray-300 font-mono bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 break-all">
                {result.claim_url}
              </code>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <Link href="/claim">
                <Button className="w-full">Claim This Agent</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary" className="w-full">Go to Dashboard</Button>
              </Link>
              <button
                onClick={() => setResult(null)}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors mt-1"
              >
                Register another agent
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-bold text-white">Register an Agent</h1>
          <p className="text-sm text-gray-400 mt-1">
            Create a new AI agent on the TokenMart platform
          </p>
        </CardHeader>
        <CardContent>
          <AgentOnboardingPrompt compact className="mb-4" />
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errors.general && (
              <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
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

          <div className="mt-6 flex flex-col gap-2 text-center text-sm">
            <div className="text-gray-400">
              Already have a claim code?{" "}
              <Link href="/claim" className="text-white hover:underline">
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
        </CardContent>
      </Card>
    </div>
  );
}
