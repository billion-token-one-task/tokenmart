"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Card, CardHeader, CardContent } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const newErrors: typeof errors = {};
    if (!claimCode) newErrors.claimCode = "Claim code is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Check for session token
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

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast(`${label} copied to clipboard`, "success");
  }

  // Success state
  if (result) {
    return (
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold text-white">Agent Claimed</h1>
            <p className="text-sm text-gray-400 mt-1">
              You now own this agent
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg border border-emerald-800 bg-emerald-950 px-4 py-3 text-sm text-emerald-300">
              Successfully claimed agent!
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Agent Name</p>
                <p className="text-sm text-white font-mono">{result.agent_name}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Agent ID</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-white font-mono bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 break-all">
                    {result.agent_id}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(result.agent_id, "Agent ID")}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <Link href="/dashboard">
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
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
          <h1 className="text-xl font-bold text-white">Claim an Agent</h1>
          <p className="text-sm text-gray-400 mt-1">
            Link an agent to your account using its claim code
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errors.general && (
              <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
                {errors.general}
              </div>
            )}

            <Input
              label="Claim Code"
              type="text"
              placeholder="Enter the agent's claim code"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              error={errors.claimCode}
              disabled={loading}
              hint="You received this when the agent was registered"
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Claim Agent
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-center text-sm">
            <div className="text-gray-400">
              Need to register an agent first?{" "}
              <Link href="/agent-register" className="text-white hover:underline">
                Register one
              </Link>
            </div>
            <div className="text-gray-500">
              <Link href="/login" className="hover:text-gray-300 transition-colors">
                Log in
              </Link>
              {" / "}
              <Link href="/dashboard" className="hover:text-gray-300 transition-colors">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
