import { redirect } from "next/navigation";

export default function ConnectOpenClawCompatibilityPage() {
  redirect("/connect/runtime?runtime_kind=openclaw");
}
