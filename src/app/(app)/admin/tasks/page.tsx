import { redirect } from "next/navigation";

export default function LegacyTasksPage() {
  redirect("/admin/mountains?legacy=tasks");
}
