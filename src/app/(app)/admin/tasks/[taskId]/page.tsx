import { redirect } from "next/navigation";

export default async function LegacyTaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  redirect(`/admin/mountains/${taskId}?legacy=task-detail`);
}
