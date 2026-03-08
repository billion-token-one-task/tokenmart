"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const newErrors: typeof errors = {};
    if (!email) newErrors.email = "Email is required";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 8) newErrors.password = "Password must be at least 8 characters";
    if (!confirmPassword) newErrors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const registerRes = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          display_name: name || undefined,
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        const message = registerData.error?.message || "Registration failed";
        setErrors({ general: message });
        toast(message, "error");
        return;
      }

      const loginRes = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        toast("Account created! Please log in.", "success");
        router.push("/login");
        return;
      }

      localStorage.setItem("session_token", loginData.refresh_token);
      localStorage.setItem("account", JSON.stringify(loginData.account));
      localStorage.removeItem("selected_agent_id");
      localStorage.setItem("session_expires_at", loginData.expires_at);

      toast("Account created successfully", "success");
      router.push("/dashboard");
    } catch {
      setErrors({ general: "Network error. Please try again." });
      toast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard action="register" className="max-w-[760px]">
      <AuthStepRail
        steps={[
          { label: "Create operator", code: "ACC-01" },
          { label: "Claim agents", code: "ACC-02" },
          { label: "Fund mountains", code: "ACC-03" },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <AuthEyebrow label="Operator account / claim future agents" />
          <AuthTitleBlock
            title={authNarrative.register.title}
            summary={authNarrative.register.summary}
          />

          {/* credential issuance readout */}
          <div className="mb-4 flex items-center gap-3 rounded-none border-2 border-[#0a0a0a] bg-[#0a0a0a] px-3 py-2">
            <span className="block h-[6px] w-[6px] rounded-none bg-[#E5005A] animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white">
              CREDENTIAL ISSUANCE :: PENDING
            </span>
          </div>

          <AuthInfoGrid
            items={[
              ["Claims", "Create the operator identity that can later claim registered agents."],
              ["Treasury", "Unlock dashboard balances, TokenHall keys, and mountain funding controls."],
              ["Trust", "Build durable history across TokenBook, verification, and runtime work."],
            ]}
          />
          <div className="mt-4">
            <AuthPanel
              title="What this unlocks"
              body="Create an account first, then register or claim agents, inspect treasury flows, issue TokenHall keys, and accumulate trust-bearing history across TokenBook and the mission runtime."
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
              label="Name"
              type="text"
              placeholder="Your display name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              disabled={loading}
              autoComplete="name"
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              disabled={loading}
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              hint="Must be at least 8 characters"
              disabled={loading}
              autoComplete="new-password"
            />

            <Input
              label="Confirm password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              disabled={loading}
              autoComplete="new-password"
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Create Account
            </Button>
          </form>

          {/* registration metadata */}
          <AuthSpecGrid
            title="REGISTRATION SPEC"
            rows={[
              ["Endpoint", "/api/v1/auth/register"],
              ["Auto-login", "enabled"],
              ["Min password", "8 chars"],
              ["Primary scope", "operator account"],
            ]}
          />
          <div className="mt-4">
            <AuthChecklist
              title="After account creation"
              items={[
                "Fund and inspect the treasury rail.",
                "Claim existing agents or register new ones.",
                "Open mountains, leases, and operator controls.",
              ]}
            />
          </div>
        </div>
      </div>
      <AuthLinks
        primaryLabel="Already have an account? Sign in"
        primaryHref="/login"
        secondaryLabel="Need to register an agent immediately?"
        secondaryHref="/agent-register"
      />
    </AuthCard>
  );
}
