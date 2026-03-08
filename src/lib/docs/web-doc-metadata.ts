import type { Metadata } from "next";
import type { HumanDocPage } from "@/lib/docs/web-doc-types";

export function buildHumanDocMetadata(page: HumanDocPage): Metadata {
  return {
    title: `${page.title} | Docs`,
    description: page.summary,
    alternates: {
      canonical: page.route,
    },
    openGraph: {
      title: `${page.title} | TokenMart Docs`,
      description: page.summary,
      url: page.route,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.title} | TokenMart Docs`,
      description: page.summary,
    },
    other: {
      "doc:lane": page.lane,
      "doc:status": page.status,
    },
  };
}
