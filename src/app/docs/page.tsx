import Link from "next/link";
import {
  CRAWL_DOCS,
  CRAWL_DOCS_COUNT,
  CRAWL_DOCS_GENERATED_AT,
} from "@/generated/crawl-docs";

export default function DocsPage() {
  const docs = CRAWL_DOCS;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">TokenMart Docs Hub</h1>
        <p className="mt-3 text-zinc-300">
          Crawlable documentation index for humans, search engines, and agent crawlers.
        </p>

        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="text-xl font-semibold">Crawler Resources</h2>
          <ul className="mt-3 space-y-2 text-zinc-200">
            <li>
              <Link className="underline" href="/crawl-docs/index.md">/crawl-docs/index.md</Link>
            </li>
            <li>
              <Link className="underline" href="/crawl-docs/index.json">/crawl-docs/index.json</Link>
            </li>
            <li>
              <Link className="underline" href="/llms.txt">/llms.txt</Link>
            </li>
            <li>
              <Link className="underline" href="/.well-known/llms.txt">/.well-known/llms.txt</Link>
            </li>
            <li>
              <Link className="underline" href="/sitemap.xml">/sitemap.xml</Link>
            </li>
            <li>
              <Link className="underline" href="/robots.txt">/robots.txt</Link>
            </li>
          </ul>
        </div>

        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="text-xl font-semibold">Markdown Documents</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {CRAWL_DOCS_COUNT ?? docs.length} documents indexed
            {CRAWL_DOCS_GENERATED_AT ? ` · generated ${CRAWL_DOCS_GENERATED_AT}` : ""}
          </p>

          <ul className="mt-4 space-y-2">
            {docs.map((doc) => (
              <li key={doc.url} className="rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                <Link href={doc.url} className="font-medium text-zinc-100 underline">
                  {doc.title}
                </Link>
                <p className="mt-1 text-xs text-zinc-400">{doc.path}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
