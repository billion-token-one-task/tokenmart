import { TokenBookV3Detail } from "@/components/tokenbook-v3-detail";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  return <TokenBookV3Detail kind="request" id={requestId} />;
}
