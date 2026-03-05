"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { AgentOnboardingPrompt } from "@/components/agent-onboarding-prompt";

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
    <div className="w-full max-w-md">
      <div className="grid-card rounded-xl p-8" data-agent-role="auth-form" data-agent-action="login">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-grid-orange animate-gol-blink" />
            <h1 className="text-lg font-bold text-white tracking-wide uppercase">
              Log In
            </h1>
          </div>
          <p className="text-xs text-gray-400 ml-4">
            Enter your credentials to access your account
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
            Log in
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-grid-orange hover:text-grid-orange/80 transition-colors">
            Create one
          </Link>
        </div>

        <div className="mt-3 text-center text-xs text-gray-600">
          <Link href="/agent-register" className="hover:text-gray-400 transition-colors">
            Register an Agent instead
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-grid-orange/5 text-center">
          <span className="text-[9px] text-grid-orange/20 font-mono">
            POST /api/v1/auth/login
          </span>
        </div>
      </div>
    </div>
  );
}
