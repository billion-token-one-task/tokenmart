import Link from "next/link";
import type { CrawlDocEntry } from "@/generated/crawl-docs";
import { formatDocsLabel } from "@/lib/docs";

/* ── viewfinder brackets ── */
function Brackets({ size = 10, color = "#0a0a0a" }: { size?: number; color?: string }) {
  const s = `${size}px`;
  const b = `2px solid ${color}`;
  return (
    <>
      <span className="pointer-events-none absolute left-0 top-0" style={{ width: s, height: s, borderTop: b, borderLeft: b }} aria-hidden="true" />
      <span className="pointer-events-none absolute right-0 top-0" style={{ width: s, height: s, borderTop: b, borderRight: b }} aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-0 left-0" style={{ width: s, height: s, borderBottom: b, borderLeft: b }} aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-0 right-0" style={{ width: s, height: s, borderBottom: b, borderRight: b }} aria-hidden="true" />
    </>
  );
}

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
    <section className="relative overflow-hidden rounded-none border-2 border-[#0a0a0a] bg-white px-5 py-6 shadow-[4px_4px_0_#0a0a0a] sm:px-6 sm:py-7">
      <Brackets size={14} />
      {/* diagonal hatch pattern on right */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-44 crosshatch-wide opacity-25"
        aria-hidden="true"
        style={{
          maskImage: "linear-gradient(270deg, black 0%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(270deg, black 0%, transparent 100%)",
        }}
      />
      {/* scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        aria-hidden="true"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #0a0a0a 2px, #0a0a0a 3px)",
        }}
      />
      <div className="relative z-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{eyebrow}</div>
        <h1 className="mt-3 max-w-4xl font-display text-[clamp(2.4rem,5vw,4.8rem)] uppercase leading-[0.88] tracking-[0.01em] text-[#0a0a0a]">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-[13px] leading-6 text-[var(--color-text-secondary)]">{description}</p>
        {/* technical readout */}
        <div className="mt-3 flex items-center gap-4 border-t border-[#0a0a0a]/10 pt-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">SYSTEM::DOCS</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">SURFACE::WEB</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">NAV::CURATED</span>
          <span className="ml-auto flex items-center gap-[1px]" aria-hidden="true">
            {[2, 1, 3, 1, 2, 1, 2, 3, 1].map((w, i) => (
              <span key={i} className="block bg-[#0a0a0a]/30" style={{ width: `${w}px`, height: "8px" }} />
            ))}
          </span>
        </div>
        {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}

export function DocsStatRow({
  stats,
}: {
  stats: Array<{ label: string; value: string | number; detail: string }>;
}) {
  return (
    <div className="grid gap-0 border-2 border-[#0a0a0a] md:grid-cols-3">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`group relative p-4 transition-colors hover:bg-[#E5005A] hover:text-white ${
            i < stats.length - 1 ? "border-b-2 border-[#0a0a0a] md:border-b-0 md:border-r-2" : ""
          }`}
        >
          <Brackets size={8} />
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] group-hover:text-white/70">{stat.label}</div>
          <div className="mt-2 font-display text-4xl uppercase leading-none tracking-[0.01em] text-[#0a0a0a] group-hover:text-white">{stat.value}</div>
          <div className="mt-2 text-[12px] leading-5 text-[var(--color-text-secondary)] group-hover:text-white/80">{stat.detail}</div>
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
      className="group block rounded-none border-0 bg-white p-4 transition-colors hover:bg-[#E5005A] hover:text-white"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] group-hover:text-white/70">{eyebrow}</div>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="font-display text-xl uppercase leading-tight tracking-[0.01em] text-[#0a0a0a] group-hover:text-white">{title}</div>
        <span className="font-mono text-[14px] font-bold text-[#0a0a0a] transition-transform group-hover:translate-x-1 group-hover:text-white">
          &rarr;
        </span>
      </div>
      <p className="mt-2 text-[12px] leading-5 text-[var(--color-text-secondary)] group-hover:text-white/80">{description}</p>
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
      ? "border-[#E5005A] bg-[#E5005A] text-white hover:bg-[#0a0a0a] hover:border-[#0a0a0a]"
      : "border-2 border-[#0a0a0a] bg-transparent text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white";

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-none border-2 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] font-medium transition-colors ${variantClass}`}
    >
      {label}
    </Link>
  );
}

export function DocsDocCard({ doc }: { doc: CrawlDocEntry }) {
  return (
    <Link
      href={doc.url}
      className="group relative block rounded-none border-2 border-[#0a0a0a] bg-white px-4 py-3 transition-colors hover:bg-[#E5005A] hover:text-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-[#0a0a0a] group-hover:text-white">{doc.title}</div>
          <div className="mt-0.5 font-mono text-[10px] text-[var(--color-text-tertiary)] group-hover:text-white/60">{doc.path}</div>
        </div>
        <span className="rounded-none border-2 border-[#0a0a0a] bg-white px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] group-hover:border-white/40 group-hover:bg-transparent group-hover:text-white/70">
          {formatDocsLabel(doc.category)}
        </span>
      </div>
      <p className="mt-2 text-[12px] leading-5 text-[var(--color-text-secondary)] group-hover:text-white/80">{doc.summary}</p>
      {/* dense metadata row */}
      <div className="mt-2 flex items-center gap-3 border-t border-[#0a0a0a]/10 pt-1.5 group-hover:border-white/20">
        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] group-hover:text-white/50">CAT::{formatDocsLabel(doc.category).toUpperCase()}</span>
        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] group-hover:text-white/50">PATH::{doc.path.split("/").pop()?.toUpperCase()}</span>
      </div>
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
    <section id={id} className="relative rounded-none border-2 border-[#0a0a0a] bg-[rgba(255,249,252,0.94)] p-5">
      <Brackets size={10} />
      {/* barcode-label eyebrow */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{eyebrow}</span>
        <span className="flex items-center gap-[1px]" aria-hidden="true">
          {[2, 1, 3, 1, 2, 1, 2].map((w, i) => (
            <span key={i} className="block bg-[#0a0a0a]/25" style={{ width: `${w}px`, height: "8px" }} />
          ))}
        </span>
      </div>
      <div className="mt-2 font-display text-[2rem] uppercase leading-tight tracking-[0.01em] text-[#0a0a0a]">{title}</div>
      {description ? <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[var(--color-text-secondary)]">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function DocsDetailGrid({
  items,
}: {
  items: Array<{ eyebrow: string; title: string; description: string }>;
}) {
  return (
    <div className="grid gap-0 border-2 border-[#0a0a0a] md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={`${item.eyebrow}-${item.title}`}
          className={`group relative p-4 transition-colors hover:bg-[#E5005A] hover:text-white ${
            i < items.length - 1 ? "border-b-2 border-[#0a0a0a] xl:border-b-0 xl:border-r-2" : ""
          }`}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] group-hover:text-white/70">{item.eyebrow}</div>
          <div className="mt-2 text-[15px] font-medium text-[#0a0a0a] group-hover:text-white">{item.title}</div>
          <p className="mt-2 text-[12px] leading-5 text-[var(--color-text-secondary)] group-hover:text-white/80">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

export function DocsMethodologyShell({
  hero,
  anchorTitle = "On this page",
  anchors,
  rail,
  children,
}: {
  hero: React.ReactNode;
  anchorTitle?: string;
  anchors: Array<{ id: string; label: string; eyebrow?: string }>;
  rail?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {hero}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-6">{children}</div>
        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <DocsAnchorNav title={anchorTitle} items={anchors} />
          {rail}
        </div>
      </div>
    </div>
  );
}

export function DocsAnchorNav({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; label: string; eyebrow?: string }>;
}) {
  return (
    <nav
      aria-label={title}
      className="rounded-none border-2 border-[#0a0a0a] bg-white p-3 shadow-[4px_4px_0_#0a0a0a]"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
        {title}
      </div>
      <div className="mt-3 space-y-0">
        {items.map((item, index) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`group block rounded-none border-2 px-3 py-2 transition-colors -mt-[2px] ${
              index === 0
                ? "border-[#0a0a0a]"
                : "border-transparent hover:border-[#0a0a0a]"
            } bg-[rgba(255,249,252,0.94)] hover:bg-[#E5005A] hover:text-white`}
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)] group-hover:text-white/70">
              {item.eyebrow ?? "SECTION"}
            </div>
            <div className="mt-1 text-[12px] font-medium leading-5 text-[#0a0a0a] group-hover:text-white">
              {item.label}
            </div>
          </a>
        ))}
      </div>
    </nav>
  );
}

export function DocsMethodologyCallout({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-none border-2 border-[#0a0a0a] bg-[#0a0a0a] px-4 py-4 text-white">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-28 crosshatch-wide opacity-20"
        aria-hidden="true"
      />
      <div className="relative z-10">
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/60">{eyebrow}</div>
        <div className="mt-2 font-display text-[1.4rem] uppercase leading-tight tracking-[0.02em]">
          {title}
        </div>
        <p className="mt-2 text-[12px] leading-6 text-white/80">{body}</p>
      </div>
    </div>
  );
}

export function DocsMethodologyMatrix({
  caption,
  columns,
  rows,
}: {
  caption?: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, React.ReactNode>>;
}) {
  return (
    <div className="rounded-none border-2 border-[#0a0a0a] bg-white">
      {caption ? (
        <div className="border-b-2 border-[#0a0a0a] bg-[rgba(255,249,252,0.94)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
          {caption}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-[#0a0a0a] text-left">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="border-r border-white/15 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/70 last:border-r-0"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? "bg-white" : "bg-[rgba(255,249,252,0.8)]"}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="align-top border-r border-t border-[#0a0a0a] px-4 py-3 text-[12px] leading-6 text-[var(--color-text-secondary)] last:border-r-0"
                  >
                    <div className="text-[12px] leading-6 text-[var(--color-text-secondary)]">
                      {row[column.key]}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DocsMethodologyFlow({
  items,
}: {
  items: Array<{ eyebrow: string; title: string; description: string }>;
}) {
  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <div
          key={`${item.eyebrow}-${item.title}`}
          className="relative rounded-none border-2 border-[#0a0a0a] bg-white px-4 py-4"
        >
          <div className="absolute left-0 top-0 h-full w-[4px] bg-[#E5005A]" aria-hidden="true" />
          <div className="ml-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-none border-2 border-[#0a0a0a] bg-[rgba(255,249,252,0.94)] font-mono text-[10px] font-bold text-[#0a0a0a]">
                {index + 1}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                {item.eyebrow}
              </span>
            </div>
            <div className="mt-3 text-[15px] font-medium text-[#0a0a0a]">{item.title}</div>
            <p className="mt-2 text-[12px] leading-6 text-[var(--color-text-secondary)]">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DocsLongformBody({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="space-y-4 text-[13px] leading-7 text-[var(--color-text-secondary)]">
      {paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 48)}>{paragraph}</p>
      ))}
    </div>
  );
}

export function DocsMethodologyBridgeGrid({
  items,
}: {
  items: Array<{ href: string; eyebrow: string; title: string; description: string }>;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {items.map((item) => (
        <DocsTrackCard
          key={`${item.href}-${item.title}`}
          href={item.href}
          eyebrow={item.eyebrow}
          title={item.title}
          description={item.description}
        />
      ))}
    </div>
  );
}
