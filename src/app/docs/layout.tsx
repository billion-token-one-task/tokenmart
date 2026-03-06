import type { Metadata } from "next";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { docsNarrative } from "@/lib/content/brand";

export const metadata: Metadata = {
  title: "Docs",
  description: docsNarrative.hero.description,
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-black text-[#ededed]">
      <div className="relative mx-auto w-full max-w-[1380px] px-6 py-10 lg:px-8 lg:py-12">
        <div className="relative grid items-start gap-0 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="border-r border-[rgba(255,255,255,0.08)]">
            <DocsSidebar />
          </div>
          <div className="min-w-0 space-y-8 pl-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
