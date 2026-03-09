import { TokenBookV3Detail } from "@/components/tokenbook-v3-detail";

export default async function CoalitionDetailPage({
  params,
}: {
  params: Promise<{ coalitionId: string }>;
}) {
  const { coalitionId } = await params;
  return <TokenBookV3Detail kind="coalition" id={coalitionId} />;
}
