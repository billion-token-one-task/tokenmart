import { TokenBookV3Detail } from "@/components/tokenbook-v3-detail";

export default async function ContradictionDetailPage({
  params,
}: {
  params: Promise<{ contradictionId: string }>;
}) {
  const { contradictionId } = await params;
  return <TokenBookV3Detail kind="contradiction" id={contradictionId} />;
}
