import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { CrawlDocEntry } from "@/generated/crawl-docs";
import { formatDocsLabel } from "@/lib/docs";

export function DocsHero({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-black px-6 py-7">
      <div className="font-mono text-[10px] text-[#666]">{eyebrow}</div>
      <h1 className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.94] tracking-[-0.08em] text-[#ededed]">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-[14px] leading-6 text-[#a1a1a1]">{description}</p>
      {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
    </section>
  );
}

export function DocsStatRow({
  stats,
}: {
  stats: Array<{ label: string; value: string | number; detail: string }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-black p-4">
          <div className="font-mono text-[10px] text-[#666]">{stat.label}</div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-[#ededed]">{stat.value}</div>
          <div className="mt-2 text-[13px] leading-6 text-[#666]">{stat.detail}</div>
        </div>
      ))}
    </div>
  );
}

export function DocsTrackCard({
  href,
  eyebrow,
  title,
  description,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-black p-4 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
    >
      <div className="font-mono text-[10px] text-[#666]">{eyebrow}</div>
      <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#ededed]">{title}</div>
      <p className="mt-3 text-[13px] leading-6 text-[#a1a1a1]">{description}</p>
    </Link>
  );
}

export function DocsActionLink({
  href,
  label,
  variant = "primary",
}: {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
}) {
  const variantClass =
    variant === "primary"
      ? "border-[rgba(255,255,255,0.14)] bg-[#ededed] text-black hover:bg-white"
      : "border-[rgba(255,255,255,0.08)] bg-transparent text-[#ededed] hover:bg-[rgba(255,255,255,0.06)]";

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-md border px-4 py-2 text-[12px] font-medium transition-colors ${variantClass}`}
    >
      {label}
    </Link>
  );
}

export function DocsDocCard({ doc }: { doc: CrawlDocEntry }) {
  return (
    <Link
      href={doc.url}
      className="block rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-black px-4 py-4 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-[#ededed]">{doc.title}</div>
          <div className="mt-1 text-[12px] text-[#444] font-mono">{doc.path}</div>
        </div>
        <span className="rounded-[4px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-2 py-1 font-mono text-[10px] text-[#666]">
          {formatDocsLabel(doc.category)}
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-6 text-[#a1a1a1]">{doc.summary}</p>
    </Link>
  );
}

export function DocsSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-black p-5">
      <div className="font-mono text-[10px] text-[#666]">{eyebrow}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#ededed]">{title}</div>
      {description ? <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[#a1a1a1]">{description}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function DocsDetailGrid({
  items,
}: {
  items: Array<{ eyebrow: string; title: string; description: string }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={`${item.eyebrow}-${item.title}`} className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-black p-4">
          <div className="font-mono text-[10px] text-[#444]">{item.eyebrow}</div>
          <div className="mt-2 text-[16px] font-medium text-[#ededed]">{item.title}</div>
          <p className="mt-3 text-[13px] leading-6 text-[#a1a1a1]">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
