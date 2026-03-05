import type { Metadata } from "next";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { AsciiArt } from "@/components/ui/ascii-art";
import { HalftoneSvg } from "@/components/ui/halftone-svg";
import { ART_GRADIENTS, NETWORK } from "@/lib/ascii-art";

export const metadata: Metadata = {
  title: "Docs",
  description: "TokenMart product, technical, runtime, and archive documentation.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#02050a] text-[#ededed]">
      <div className="relative mx-auto w-full max-w-[1380px] px-6 py-10 lg:px-8 lg:py-12">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <HalftoneSvg className="h-full w-full [mask-image:radial-gradient(circle_at_top_left,black_0%,black_26%,transparent_72%)]" />
        </div>
        <div className="pointer-events-none absolute right-8 top-8 hidden opacity-[0.1] xl:block">
          <AsciiArt lines={NETWORK} gradient={ART_GRADIENTS.NETWORK} size="md" pixelFont="font-pixel-square" />
        </div>

        <div className="relative grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
          <DocsSidebar />
          <div className="min-w-0 space-y-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
