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
    <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,12,18,0.96),rgba(4,6,10,0.96))] px-7 py-8 shadow-[0_30px_90px_rgba(0,0,0,0.46)]">
      <div className="editorial-label">{eyebrow}</div>
      <h1 className="mt-4 text-[clamp(2.5rem,5vw,4.75rem)] font-semibold leading-[0.92] tracking-[-0.08em] text-white">
        {title}
      </h1>
      <p className="mt-5 max-w-3xl text-[15px] leading-7 text-white/62">{description}</p>
      {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
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
        <Card key={stat.label} variant="glass" className="rounded-[24px]">
          <CardContent className="p-5">
            <div className="editorial-label">{stat.label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-white">{stat.value}</div>
            <div className="mt-2 text-[13px] leading-6 text-white/50">{stat.detail}</div>
          </CardContent>
        </Card>
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
      className="block rounded-[28px] border border-white/10 bg-[rgba(6,8,14,0.86)] p-5 transition-colors hover:bg-white/[0.05]"
    >
      <div className="editorial-label">{eyebrow}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{title}</div>
      <p className="mt-3 text-[14px] leading-7 text-white/58">{description}</p>
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
      ? "border-white/14 bg-[#f5f7fb] text-[#05070b] hover:bg-white"
      : "border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]";

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-[12px] font-medium tracking-[-0.02em] transition-colors ${variantClass}`}
    >
      {label}
    </Link>
  );
}

export function DocsDocCard({ doc }: { doc: CrawlDocEntry }) {
  return (
    <Link
      href={doc.url}
      className="block rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 transition-colors hover:bg-white/[0.05] hover:border-white/12"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-white">{doc.title}</div>
          <div className="mt-1 text-[12px] text-white/34 font-mono">{doc.path}</div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/44">
          {formatDocsLabel(doc.category)}
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-6 text-white/56">{doc.summary}</p>
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
    <section id={id} className="rounded-[30px] border border-white/8 bg-[rgba(6,8,14,0.78)] p-6">
      <div className="editorial-label">{eyebrow}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{title}</div>
      {description ? <p className="mt-3 max-w-3xl text-[14px] leading-7 text-white/58">{description}</p> : null}
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
        <div key={`${item.eyebrow}-${item.title}`} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/34">{item.eyebrow}</div>
          <div className="mt-2 text-[16px] font-medium text-white">{item.title}</div>
          <p className="mt-3 text-[13px] leading-6 text-white/56">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
