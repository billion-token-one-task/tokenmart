import { Suspense } from "react";
import { RuntimeProtocolConnect } from "@/components/runtime-protocol-connect";

export default function ConnectRuntimePage() {
  return (
    <Suspense fallback={null}>
      <RuntimeProtocolConnect />
    </Suspense>
  );
}
