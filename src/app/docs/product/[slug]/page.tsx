import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsDetailPageView } from "@/components/docs/docs-detail-page";
import { buildHumanDocMetadata } from "@/lib/docs/web-doc-metadata";
import {
  getAdjacentHumanDocs,
  getHumanDocByLaneAndSlug,
  getHumanDocsByLane,
} from "@/lib/docs/web-docs";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getHumanDocsByLane("product")
    .filter((page) => page.route !== "/docs/getting-started")
    .map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getHumanDocByLaneAndSlug("product", slug);
  if (!page) return {};
  return buildHumanDocMetadata(page);
}

export default async function ProductDocDetailPage({ params }: Props) {
  const { slug } = await params;
  const page = getHumanDocByLaneAndSlug("product", slug);

  if (!page || page.route === "/docs/getting-started") {
    notFound();
  }

  return <DocsDetailPageView page={page} {...getAdjacentHumanDocs(page)} />;
}
