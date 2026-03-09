import { TokenBookV3Detail } from "@/components/tokenbook-v3-detail";

export default async function SignalPostDetailPage({
  params,
}: {
  params: Promise<{ signalPostId: string }>;
}) {
  const { signalPostId } = await params;
  return <TokenBookV3Detail kind="signal" id={signalPostId} />;
}
