"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Badge, Card, CardContent, CardHeader } from "@/components/ui";

type Tone = "brand" | "neutral" | "success" | "warning";

const toneClasses: Record<Tone, string> = {
  brand: "from-[#e5005a] via-[#ff7cab] to-[#ffd2e4]",
  neutral: "from-[#0a0a0a] via-[#565656] to-[#d4d4d4]",
  success: "from-[#0a0a0a] via-[#155e47] to-[#b7f4d7]",
  warning: "from-[#3b2506] via-[#d97706] to-[#fcd9a4]",
};

function relativeFromNow(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, amount] of ranges) {
    if (Math.abs(deltaSeconds) >= amount || unit === "minute") {
      return formatter.format(Math.round(deltaSeconds / amount), unit);
    }
  }

  return "just now";
}

export function formatCompactValue(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

export function formatRuntimeDate(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function RuntimeSection({
  eyebrow,
  title,
  detail,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 border-b-2 border-[#0a0a0a] pb-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">
            {eyebrow}
          </div>
          <h2 className="mt-1 font-display text-[2rem] uppercase leading-none tracking-[0.04em] text-[#0a0a0a]">
            {title}
          </h2>
          {detail ? (
            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#4a4036]">{detail}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function TelemetryTile({
  label,
  value,
  detail,
  tone = "brand",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
}) {
  return (
    <div className="relative overflow-hidden border-2 border-[#0a0a0a] bg-white">
      <div
        className={`h-2 w-full bg-gradient-to-r ${toneClasses[tone]}`}
        aria-hidden="true"
      />
      <div className="space-y-3 px-4 py-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">
          {label}
        </div>
        <div className="font-display text-[2.6rem] uppercase leading-none text-[#0a0a0a]">
          {value}
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
          {detail}
        </div>
      </div>
    </div>
  );
}

export function PhaseRail({
  items,
}: {
  items: Array<{
    id: string;
    label: string;
    count: string;
    note: string;
    active?: boolean;
  }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`relative border-2 px-4 py-4 ${
            item.active
              ? "border-[#e5005a] bg-[#fff1f7]"
              : "border-[#0a0a0a] bg-white"
          }`}
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center border-2 border-current font-mono text-[10px] uppercase tracking-[0.14em]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6b6050]">
                {item.label}
              </div>
              <div className="font-display text-[1.7rem] uppercase leading-none text-[#0a0a0a]">
                {item.count}
              </div>
            </div>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
            {item.note}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RuntimeHero({
  eyebrow,
  title,
  description,
  badges,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badges?: string[];
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border-2 border-[#0a0a0a] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,234,242,0.9))]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at top right, rgba(229,0,90,0.28), transparent 32%), repeating-linear-gradient(135deg, rgba(10,10,10,0.08) 0 1px, transparent 1px 12px)",
        }}
      />
      <div className="relative grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:px-6 lg:py-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6b6050]">
            {eyebrow}
          </div>
          <h2 className="mt-2 font-display text-[clamp(2.6rem,5vw,4.8rem)] uppercase leading-[0.9] tracking-[0.03em] text-[#0a0a0a]">
            {title}
          </h2>
          <p className="mt-4 max-w-3xl text-[14px] leading-7 text-[#4a4036]">{description}</p>
          {badges?.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge} variant="glass">
                  {badge}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

export function MountainCard({
  href,
  name,
  status,
  ridge,
  contract,
  lease,
  deliverables,
  note,
  updatedAt,
}: {
  href: string;
  name: string;
  status: ReactNode;
  ridge: string;
  contract: string;
  lease: string;
  deliverables: string;
  note: string;
  updatedAt: string;
}) {
  return (
    <Link href={href} className="block">
      <Card variant="glass-elevated" className="h-full transition-transform duration-150 hover:-translate-y-1">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">
                Mountain
              </div>
              <div className="mt-2 font-display text-[1.9rem] uppercase leading-none text-[#0a0a0a]">
                {name}
              </div>
            </div>
            {status}
          </div>
          <div
            className="h-24 border-2 border-[#0a0a0a] bg-[linear-gradient(180deg,rgba(255,243,248,0.95),rgba(255,255,255,0.95))]"
            aria-hidden="true"
          >
            <svg viewBox="0 0 320 96" className="h-full w-full">
              <path
                d="M0 78 36 56 62 63 96 26 128 41 161 18 195 35 226 12 258 42 286 28 320 52"
                fill="none"
                stroke="#e5005a"
                strokeWidth="4"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
              <path
                d="M0 82 42 76 96 41 128 57 161 28 196 52 228 18 258 48 320 34"
                fill="none"
                stroke="#0a0a0a"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
            </svg>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <SignalPair label="Ridge" value={ridge} />
            <SignalPair label="Lease" value={lease} />
            <SignalPair label="Deliverables" value={deliverables} />
          </div>
          <div className="border-2 border-[#0a0a0a] bg-white px-3 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">
              Work Spec
            </div>
            <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">{contract}</div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
              {note}
            </div>
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
              {relativeFromNow(updatedAt)}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function SignalPair({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-2 border-[#0a0a0a] bg-[rgba(255,255,255,0.8)] px-3 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6050]">
        {label}
      </div>
      <div className="mt-2 font-mono text-[12px] uppercase tracking-[0.12em] text-[#0a0a0a]">
        {value}
      </div>
    </div>
  );
}

export function LeaseCard({
  title,
  subtitle,
  status,
  stats,
  href,
  cta,
}: {
  title: string;
  subtitle: string;
  status: ReactNode;
  stats: Array<{ label: string; value: string }>;
  href?: string;
  cta?: string;
}) {
  const content = (
    <Card variant="glass" className="h-full">
      <CardHeader className="flex items-start justify-between gap-4">
        <div>
          <div className="font-display text-[1.45rem] uppercase leading-none text-[#0a0a0a]">
            {title}
          </div>
          <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">{subtitle}</div>
        </div>
        {status}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {stats.map((stat) => (
            <SignalPair key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
        {cta ? (
          <div className="pt-1">
            <span className="inline-flex border-2 border-[#0a0a0a] bg-white px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a]">
              {cta}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export function RuntimeList({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    description: string;
    badge: ReactNode;
    meta: string;
  }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="border-2 border-[#0a0a0a] bg-white px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-display text-[1.4rem] uppercase leading-none text-[#0a0a0a]">
                {item.title}
              </div>
              <div className="mt-2 text-[13px] leading-6 text-[#4a4036]">{item.description}</div>
            </div>
            <div className="shrink-0">{item.badge}</div>
          </div>
          <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a7a68]">
            {item.meta}
          </div>
        </div>
      ))}
    </div>
  );
}
