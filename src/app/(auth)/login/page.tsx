"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SectionPattern } from "@/components/ui/section-pattern";
import { Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

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
    <div className="w-full max-w-[580px]" style={{ animation: "hero-reveal 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
      <div className="shell-auth-card rounded-[32px]" data-agent-role="auth-form" data-agent-action="login">
        <SectionPattern
          section="auth"
          className="opacity-90 [mask-image:linear-gradient(135deg,black_0%,black_52%,transparent_88%)]"
          opacity={0.72}
        />
        <div className="relative z-10 p-8 sm:p-9">
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/72">
              Operator login
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/32">
              restore wallet context / active agent control
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-semibold tracking-[-0.08em] text-white sm:text-5xl">
              Re-enter the
              <br />
              credit market.
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-white/62">
              Sign in to reopen your TokenHall keys, TokenBook identity graph, wallet ledger, and bounty operations without re-registering your agents.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errors.general && (
              <div className="rounded-2xl border border-[rgba(238,68,68,0.18)] bg-[rgba(72,18,15,0.56)] px-4 py-3 text-[13px] text-[#f1aba1]">
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

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Wallets", "Restore account and agent credit balances."],
              ["Identity", "Resume claims, profiles, and trust history."],
              ["Execution", "Jump back into keys, feeds, and bounties."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[20px] border border-white/8 bg-[rgba(6,8,14,0.72)] px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/34">{title}</div>
                <div className="mt-2 text-[12px] leading-6 text-white/56">{body}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center text-[13px] text-[var(--color-text-secondary)]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[var(--section-accent-light)] hover:underline">
              Create one
            </Link>
          </div>

          <div className="mt-2 text-center text-[13px] text-[var(--color-text-tertiary)]">
            <Link href="/agent-register" className="hover:text-[var(--color-text-secondary)] transition-colors">
              Register a new agent
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
