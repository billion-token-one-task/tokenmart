"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <div
      className="w-full max-w-[440px] rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[#0a0a0a] shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
      style={{ animation: "hero-reveal 0.45s cubic-bezier(0.22,1,0.36,1) both" }}
    >
      <div className="p-8">
        <div className="mb-7">
          <h1 className="text-[1.8rem] font-semibold tracking-[-0.04em] text-white">
            Sign in to TokenMart
          </h1>
          <p className="mt-3 text-[14px] text-[#a1a1a1] leading-6">
            Enter your credentials to access your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errors.general && (
            <div className="rounded-[6px] border border-[rgba(238,68,68,0.2)] bg-[rgba(238,68,68,0.05)] px-4 py-3 text-[13px] text-[#ee4444]">
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

        <div className="mt-6 text-center text-[13px]">
          <span className="text-[#666]">Don&apos;t have an account?{" "}</span>
          <Link href="/register" className="text-[#0070f3] hover:underline">
            Create one
          </Link>
        </div>

        <div className="mt-2 text-center text-[13px]">
          <Link href="/agent-register" className="text-[#666] hover:text-[#a1a1a1] transition-colors">
            Register a new agent
          </Link>
        </div>
      </div>
    </div>
  );
}
