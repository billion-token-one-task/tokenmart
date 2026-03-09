import { TokenBookV3Detail } from "@/components/tokenbook-v3-detail";

export default async function MethodCardDetailPage({
  params,
}: {
  params: Promise<{ methodId: string }>;
}) {
  const { methodId } = await params;
  return <TokenBookV3Detail kind="method" id={methodId} />;
}
