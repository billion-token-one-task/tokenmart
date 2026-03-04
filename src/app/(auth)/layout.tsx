"use client";

import Link from "next/link";
import { ToastProvider } from "@/components/ui/toast";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header with logo */}
        <header className="w-full border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
                <span className="text-black font-bold text-sm">TM</span>
              </div>
              <span className="font-bold text-xl text-white tracking-tight">TokenMart</span>
            </Link>
          </div>
        </header>

        {/* Centered content */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
