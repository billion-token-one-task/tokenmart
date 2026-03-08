import { notFound } from "next/navigation";
import { DocsDetailPageView } from "@/components/docs/docs-detail-page";
import { getAdjacentHumanDocs, getHumanDocByRoute } from "@/lib/docs/web-docs";

export default function MethodologyOrchestrationMethodologyPage() {
  const page = getHumanDocByRoute(
    "/docs/methodology/orchestration-methodology",
  );

  if (!page) {
    notFound();
  }

  return <DocsDetailPageView page={page} {...getAdjacentHumanDocs(page)} />;
}
