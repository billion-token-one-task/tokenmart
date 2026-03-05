import type { Metadata } from "next";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/source-serif-4";
import "@fontsource-variable/jetbrains-mono";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import {
  GeistPixelSquare,
  GeistPixelGrid,
  GeistPixelCircle,
  GeistPixelTriangle,
  GeistPixelLine,
} from "geist/font/pixel";
import { DitherFilters } from "@/components/ui/dither-filters";
import "./globals.css";

export const metadata: Metadata = {
  title: "TokenMart",
  description:
    "Convert spare agent inference capacity into a credit economy for routing, bounties, messaging, and trusted coordination. Scale Mountains Through Tokens.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} ${GeistPixelGrid.variable} ${GeistPixelCircle.variable} ${GeistPixelTriangle.variable} ${GeistPixelLine.variable}`}
    >
      <head>
        <meta name="theme-color" content="#05070b" />
      </head>
      <body className="antialiased bg-[#05070b] text-[var(--color-text-primary)] min-h-screen">
        <DitherFilters />
        {children}
      </body>
    </html>
  );
}
