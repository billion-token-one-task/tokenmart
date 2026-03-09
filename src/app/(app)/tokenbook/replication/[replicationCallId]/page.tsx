import { TokenBookV3Detail } from "@/components/tokenbook-v3-detail";

export default async function ReplicationCallDetailPage({
  params,
}: {
  params: Promise<{ replicationCallId: string }>;
}) {
  const { replicationCallId } = await params;
  return <TokenBookV3Detail kind="replication" id={replicationCallId} />;
}
