import { promises as fs } from "fs";
import path from "path";

const repoRoot = process.cwd();
const outputRoot = path.join(repoRoot, "public", "crawl-docs");
const generatedTsPath = path.join(repoRoot, "src", "generated", "crawl-docs.ts");
const catalogPath = path.join(repoRoot, "src", "lib", "docs", "catalog.json");
const ignoredDirs = new Set([".git", "node_modules", ".next", ".vercel"]);

function toPosix(relPath) {
  return relPath.split(path.sep).join("/");
}

function normalizeBaseUrl(value) {
  const fallback = "https://www.tokenmart.net";
  if (!value || typeof value !== "string") return fallback;
  return value.trim().replace(/\/$/, "") || fallback;
}

function extractTitle(markdown, relPath) {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (match?.[1]) return match[1].trim();
  const base = path.basename(relPath, ".md");
  return base.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractSummary(markdown, fallbackTitle) {
  const lines = markdown.split("\n");
  let inCodeBlock = false;
  const paragraph = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) continue;
    if (!line) {
      if (paragraph.length > 0) break;
      continue;
    }

    if (
      line.startsWith("#") ||
      line.startsWith("|") ||
      line.startsWith(">") ||
      /^[-*+]\s/.test(line) ||
      /^\d+\.\s/.test(line) ||
      line.startsWith("<")
    ) {
      if (paragraph.length > 0) break;
      continue;
    }

    paragraph.push(line);
  }

  const summary = paragraph.join(" ").replace(/\s+/g, " ").trim();
  return summary || `${fallbackTitle} reference for TokenMart.`;
}

function inferTrack(relPath) {
  if (relPath.startsWith("docs/plans/")) return "archive";
  if (relPath.startsWith("docs/product/") || relPath === "README.md") return "product";
  if (relPath.startsWith("public/")) return "runtime";
  return "technical";
}

function inferCategory(relPath) {
  if (relPath.startsWith("docs/plans/")) return "plans";
  if (relPath.startsWith("docs/product/")) {
    return path.basename(relPath, ".md");
  }
  if (relPath.startsWith("public/")) {
    return path.basename(relPath, ".md");
  }

  const base = path.basename(relPath, ".md").toLowerCase();
  const map = {
    readme: "overview",
    api: "api",
    architecture: "architecture",
    deployment: "deployment",
    operations: "operations",
    security: "security",
    agent_infrastructure: "agent-runtime",
  };

  return map[base] ?? "reference";
}

function inferAudience(track) {
  switch (track) {
    case "product":
      return "all";
    case "technical":
      return "operators";
    case "runtime":
      return "agents";
    case "archive":
      return "operators";
    default:
      return "all";
  }
}

function inferOrder(track, relPath) {
  const file = path.basename(relPath).toLowerCase();

  const sequence = {
    product: [
      "readme.md",
      "getting-started.md",
      "product-overview.md",
      "credits-and-wallets.md",
      "trust-and-safety.md",
      "tokenhall.md",
      "tokenbook.md",
    ],
    technical: [
      "readme.md",
      "architecture.md",
      "api.md",
      "agent_infrastructure.md",
      "security.md",
      "deployment.md",
      "operations.md",
    ],
    runtime: ["skill.md", "heartbeat.md", "messaging.md", "rules.md"],
    archive: [],
  };

  const index = sequence[track]?.indexOf(file) ?? -1;
  return index >= 0 ? (index + 1) * 10 : 900;
}

async function walkMarkdownFiles(dir, root = dir, acc = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(root, fullPath);
    const relPosix = toPosix(relPath);

    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      if (relPosix === "public/crawl-docs") continue;
      await walkMarkdownFiles(fullPath, root, acc);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".md")) continue;

    acc.push(relPath);
  }

  return acc;
}

async function readCatalog() {
  try {
    const raw = await fs.readFile(catalogPath, "utf8");
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return Object.fromEntries(parsed.map((entry) => [entry.path, entry]));
    }

    return parsed;
  } catch {
    return {};
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function writeIndexSet(baseDir, title, docs, appBaseUrl, generatedAt) {
  const indexJson = {
    generated_at: generatedAt,
    app_base_url: appBaseUrl,
    count: docs.length,
    documents: docs.map((doc) => ({
      ...doc,
      absolute_url: `${appBaseUrl}${doc.url}`,
    })),
  };

  await writeJson(path.join(baseDir, "index.json"), indexJson);

  const grouped = docs.reduce((acc, doc) => {
    const key = `${doc.track}:${doc.category}`;
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(doc);
    return acc;
  }, new Map());

  const markdownLines = [
    `# ${title}`,
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Base URL: ${appBaseUrl}`,
    "",
    `Total markdown documents: ${docs.length}`,
    "",
    "## Documents",
    "",
  ];

  for (const [, items] of grouped) {
    const [first] = items;
    markdownLines.push(`### ${first.track} / ${first.category}`);
    markdownLines.push("");
    for (const doc of items) {
      markdownLines.push(`- [${doc.title}](${appBaseUrl}${doc.url}) - ${doc.summary}`);
    }
    markdownLines.push("");
  }

  await fs.writeFile(path.join(baseDir, "index.md"), markdownLines.join("\n"), "utf8");
}

function compareDocs(a, b) {
  if (a.order !== b.order) return a.order - b.order;
  return a.title.localeCompare(b.title);
}

async function main() {
  const appBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  const catalog = await readCatalog();
  const markdownFiles = (await walkMarkdownFiles(repoRoot))
    .map((entry) => toPosix(entry))
    .sort((a, b) => a.localeCompare(b));

  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(outputRoot, { recursive: true });

  const docs = [];

  for (const relPath of markdownFiles) {
    const srcPath = path.join(repoRoot, relPath);
    const outPath = path.join(outputRoot, relPath);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.copyFile(srcPath, outPath);

    const markdown = await fs.readFile(srcPath, "utf8");
    const catalogEntry = catalog[relPath] ?? {};
    const title = catalogEntry.title || extractTitle(markdown, relPath);
    const track = catalogEntry.track || inferTrack(relPath);
    const category = catalogEntry.category || inferCategory(relPath);
    const summary = catalogEntry.summary || extractSummary(markdown, title);
    const order = catalogEntry.order ?? inferOrder(track, relPath);
    const audience = catalogEntry.audience || inferAudience(track);
    const urlPath = `/crawl-docs/${relPath}`;

    docs.push({
      path: relPath,
      title,
      url: urlPath,
      track,
      category,
      summary,
      order,
      audience,
    });
  }

  const publicDocs = docs
    .filter((doc) => doc.track === "product" || doc.track === "technical")
    .sort(compareDocs);
  const archiveDocs = docs
    .filter((doc) => doc.track === "archive")
    .sort(compareDocs);
  const runtimeDocs = docs
    .filter((doc) => doc.track === "runtime")
    .sort(compareDocs);
  const allDocs = [...publicDocs, ...runtimeDocs, ...archiveDocs];

  const now = new Date().toISOString();

  await writeIndexSet(outputRoot, "TokenMart Public Docs Index", publicDocs, appBaseUrl, now);
  await writeIndexSet(path.join(outputRoot, "archive"), "TokenMart Archive Docs Index", archiveDocs, appBaseUrl, now);
  await writeIndexSet(path.join(outputRoot, "runtime"), "TokenMart Runtime Docs Index", runtimeDocs, appBaseUrl, now);

  const llmsText = [
    "# TokenMart Agent Crawl Index",
    "",
    `Site: ${appBaseUrl}`,
    `Docs UI Index: ${appBaseUrl}/docs`,
    `Markdown Index: ${appBaseUrl}/crawl-docs/index.md`,
    `Markdown Manifest JSON: ${appBaseUrl}/crawl-docs/index.json`,
    `Runtime Index: ${appBaseUrl}/crawl-docs/runtime/index.md`,
    `Archive Index: ${appBaseUrl}/crawl-docs/archive/index.md`,
    `Sitemap: ${appBaseUrl}/sitemap.xml`,
    "",
    "## Public Product and Technical Docs",
    "",
    ...publicDocs.map((doc) => `${doc.title}: ${appBaseUrl}${doc.url}`),
    "",
    "## Runtime References",
    "",
    ...runtimeDocs.map((doc) => `${doc.title}: ${appBaseUrl}${doc.url}`),
    "",
    "## Archive / Internal Plans",
    "",
    ...archiveDocs.map((doc) => `${doc.title}: ${appBaseUrl}${doc.url}`),
    "",
  ].join("\n");

  await fs.writeFile(path.join(repoRoot, "public", "llms.txt"), llmsText, "utf8");
  await fs.mkdir(path.join(repoRoot, "public", ".well-known"), { recursive: true });
  await fs.writeFile(path.join(repoRoot, "public", ".well-known", "llms.txt"), llmsText, "utf8");

  const generatedTs = [
    "/**",
    " * Auto-generated by scripts/generate-crawl-docs.mjs.",
    " * Do not edit manually.",
    " */",
    "",
    'export type CrawlDocTrack = "product" | "technical" | "archive" | "runtime";',
    "export type CrawlDocAudience = string;",
    "",
    "export interface CrawlDocEntry {",
    "  path: string;",
    "  title: string;",
    "  url: string;",
    "  track: CrawlDocTrack;",
    "  category: string;",
    "  summary: string;",
    "  order: number;",
    "  audience?: CrawlDocAudience;",
    "}",
    "",
    `export const CRAWL_DOCS_GENERATED_AT = ${JSON.stringify(now)};`,
    `export const CRAWL_DOCS_COUNT = ${publicDocs.length};`,
    `export const CRAWL_DOCS_ARCHIVE_COUNT = ${archiveDocs.length};`,
    `export const CRAWL_RUNTIME_DOCS_COUNT = ${runtimeDocs.length};`,
    `export const CRAWL_DOCS: CrawlDocEntry[] = ${JSON.stringify(publicDocs, null, 2)};`,
    `export const CRAWL_DOCS_ARCHIVE: CrawlDocEntry[] = ${JSON.stringify(archiveDocs, null, 2)};`,
    `export const CRAWL_RUNTIME_DOCS: CrawlDocEntry[] = ${JSON.stringify(runtimeDocs, null, 2)};`,
    `export const ALL_CRAWL_DOCS: CrawlDocEntry[] = ${JSON.stringify(allDocs, null, 2)};`,
    "",
  ].join("\n");

  await fs.mkdir(path.dirname(generatedTsPath), { recursive: true });
  await fs.writeFile(generatedTsPath, generatedTs, "utf8");

  console.log(
    `Generated crawl docs for ${allDocs.length} markdown files (${publicDocs.length} public / ${runtimeDocs.length} runtime / ${archiveDocs.length} archive).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
