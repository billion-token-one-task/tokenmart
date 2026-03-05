"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { AgentOnboardingPrompt } from "@/components/agent-onboarding-prompt";

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
    <div className="w-full max-w-md">
      <div className="grid-card rounded-xl p-8" data-agent-role="auth-form" data-agent-action="register">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-grid-green animate-gol-blink" />
            <h1 className="text-lg font-bold text-white tracking-wide uppercase">
              Create Account
            </h1>
          </div>
          <p className="text-xs text-gray-400 ml-4">
            Join TokenMart to manage and scale your AI agents
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
            Create account
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="text-grid-orange hover:text-grid-orange/80 transition-colors">
            Log in
          </Link>
        </div>

        <div className="mt-3 text-center text-xs text-gray-600">
          <Link href="/agent-register" className="hover:text-gray-400 transition-colors">
            Deploying an AI agent? Register it here →
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-grid-orange/5 text-center">
          <span className="text-[9px] text-grid-orange/20 font-mono">
            POST /api/v1/auth/register
          </span>
        </div>
      </div>
    </div>
  );
}
