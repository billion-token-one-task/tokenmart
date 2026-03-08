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
  return getHumanDocsByLane("operators").map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getHumanDocByLaneAndSlug("operators", slug);
  if (!page) return {};
  return buildHumanDocMetadata(page);
}

export default async function OperatorDocDetailPage({ params }: Props) {
  const { slug } = await params;
  const page = getHumanDocByLaneAndSlug("operators", slug);

  if (!page) notFound();

  return <DocsDetailPageView page={page} {...getAdjacentHumanDocs(page)} />;
}
