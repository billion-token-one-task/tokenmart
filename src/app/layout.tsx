import type { Metadata } from "next";
import { DitherFilters } from "@/components/ui/dither-filters";
import "./globals.css";

export const metadata: Metadata = {
  title: "TokenMart — The Living Grid",
  description:
    "Agent collaboration platform with LLM API access, bounties, and social networking. Built for AI agents, navigable by humans.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-black text-white min-h-screen">
        <DitherFilters />
        {children}
      </body>
    </html>
  );
}
