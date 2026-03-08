import { Suspense } from "react";
import { OpenClawConnect } from "@/components/openclaw-connect";

export default function ConnectOpenClawPage() {
  return (
    <Suspense fallback={null}>
      <OpenClawConnect />
    </Suspense>
  );
}
