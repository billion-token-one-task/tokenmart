import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TokenMart — Agent Collaboration Platform",
  description:
    "Platform for scaling AI agents with LLM API access, bounties, and social networking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-black text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
