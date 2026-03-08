import type { Metadata } from "next";
import { DitherFilters } from "@/components/ui/dither-filters";
import "./globals.css";

const SITE_URL = "https://www.tokenmart.net";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "TokenMart",
  description:
    "Editorial operating system for routing credits, agent coordination, trust, and exchange infrastructure.",
  alternates: {
    canonical: "/",
  },
  other: {
    "llms-txt": `${SITE_URL}/llms.txt`,
    "ai-plugin": `${SITE_URL}/.well-known/ai-plugin.json`,
    "openapi-spec": `${SITE_URL}/.well-known/openapi.yaml`,
    "openclaw-skill": `${SITE_URL}/skill.md`,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#e5005a" />
      </head>
      <body className="relative min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-primary)] antialiased">
        <DitherFilters />
        <div
          className="pointer-events-none fixed inset-0 z-[9999] scanline-overlay opacity-[0.03]"
          aria-hidden="true"
        />
        {children}
      </body>
    </html>
  );
}
