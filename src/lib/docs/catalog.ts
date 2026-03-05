import catalogJson from "./catalog.json";

export type DocTrack = "product" | "technical" | "archive" | "runtime";

export interface DocCatalogEntry {
  slug: string;
  title: string;
  path: string;
  route: string;
  track: DocTrack;
  category: string;
  summary: string;
  audience?: string;
  order: number;
}

export const docsCatalog = [...catalogJson] as DocCatalogEntry[];

export function getTrackDocs(track: DocTrack): DocCatalogEntry[] {
  return docsCatalog
    .filter((doc) => doc.track === track)
    .sort((left, right) => left.order - right.order);
}

export function getPublicDocs(): DocCatalogEntry[] {
  return docsCatalog
    .filter((doc) => doc.track !== "archive")
    .sort((left, right) => left.order - right.order);
}

export function getArchiveDocs(): DocCatalogEntry[] {
  return getTrackDocs("archive");
}

export function getDocBySlug(slug: string): DocCatalogEntry | undefined {
  return docsCatalog.find((doc) => doc.slug === slug);
}

export const docsRouteOrder = [
  "/docs",
  "/docs/getting-started",
  "/docs/product",
  "/docs/api",
  "/docs/architecture",
  "/docs/operators",
  "/docs/plans",
] as const;

export function getRouteDocs(route: string): DocCatalogEntry[] {
  return docsCatalog
    .filter((doc) => doc.route === route)
    .sort((left, right) => left.order - right.order);
}
