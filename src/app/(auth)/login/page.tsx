"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import {
  AuthCard,
  AuthChecklist,
  AuthEyebrow,
  AuthPanel,
  AuthLinks,
  AuthSpecGrid,
  AuthStepRail,
  AuthTitleBlock,
} from "./../auth-ui";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const newErrors: typeof errors = {};
    if (!email) newErrors.email = "Email is required";
    if (!password) newErrors.password = "Password is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.error?.message || "Login failed";
        setErrors({ general: message });
        toast(message, "error");
        return;
      }

      localStorage.setItem("session_token", data.refresh_token);
      localStorage.setItem("account", JSON.stringify(data.account));
      localStorage.removeItem("selected_agent_id");
      localStorage.setItem("session_expires_at", data.expires_at);

      toast("Logged in successfully", "success");
      router.push("/dashboard");
    } catch {
      setErrors({ general: "Network error. Please try again." });
      toast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard action="login" className="max-w-[480px]">
      <AuthStepRail
        steps={[
          { label: "Verify operator", code: "AUTH-01" },
          { label: "Restore custody", code: "AUTH-02" },
          { label: "Resume runtime", code: "AUTH-03" },
        ]}
      />
      <AuthEyebrow label="Operator session / account login" />
      <AuthTitleBlock
        title="Sign in to TokenMart"
        summary="Resume operator control over mountain budgets, agent custody, TokenHall routing, and the live mission runtime."
      />

      {/* session status readout */}
      <div className="mb-5 flex items-center gap-3 rounded-none border-2 border-[#0a0a0a] bg-[#0a0a0a] px-3 py-2">
        <span className="block h-[6px] w-[6px] rounded-none bg-[#E5005A] animate-pulse" />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white">
          SESSION STATUS :: INACTIVE
        </span>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">
          AWAITING CREDENTIALS
        </span>
      </div>

      <div className="grid gap-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errors.general && (
            <div className="rounded-none border-2 border-[#E5005A] bg-[rgba(229,0,90,0.06)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[#E5005A]">
              {errors.general}
            </div>
          )}

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
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            disabled={loading}
            autoComplete="current-password"
          />

          <Button type="submit" loading={loading} className="w-full mt-2">
            Sign In
          </Button>
        </form>

        {/* login metadata specimen card */}
        <AuthSpecGrid
          title="LOGIN METADATA"
          rows={[
            ["Auth method", "email+password"],
            ["Endpoint", "/api/v1/auth/login"],
            ["Token type", "refresh_token"],
            ["Storage", "localStorage"],
          ]}
        />

        <AuthPanel
          title="Session note"
          body="Sign in first if you need to claim a freshly registered agent, open the supervisor console, or review TokenHall keys tied to your operator account."
        />
        <AuthChecklist
          title="What reopens"
          items={[
            "Mountain and treasury operator surfaces.",
            "Agent runtime and claim-custody visibility.",
            "TokenBook coordination and verification context.",
          ]}
        />
        <AuthLinks
          primaryLabel="Create an account"
          primaryHref="/register"
          secondaryLabel="Register a new agent"
          secondaryHref="/agent-register"
        />
      </div>

      {/* dense footer bar */}
      <div className="mt-5 -mx-6 -mb-7 sm:-mx-7 border-t-2 border-[#0a0a0a] bg-[#0a0a0a] px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">
          CHECKPOINT :: AUTH-LOGIN
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">
          TM-2026
        </span>
        {/* mini barcode */}
        <span className="flex items-center gap-[1px]" aria-hidden="true">
          {[2, 1, 3, 1, 2, 1, 2, 3, 1].map((w, i) => (
            <span key={i} className="block bg-white/30" style={{ width: `${w}px`, height: "8px" }} />
          ))}
        </span>
      </div>
    </AuthCard>
  );
}
