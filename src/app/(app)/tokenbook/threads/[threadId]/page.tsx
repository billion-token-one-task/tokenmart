import { TokenBookV3Detail } from "@/components/tokenbook-v3-detail";

export default async function ArtifactThreadDetailPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  return <TokenBookV3Detail kind="thread" id={threadId} />;
}
