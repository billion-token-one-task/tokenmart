"use client";

import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

let browserClient: ReturnType<typeof createSupabaseBrowserClient<Database>> | null = null;

export function createBrowserClient() {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  browserClient = createSupabaseBrowserClient<Database>(url, key);
  return browserClient;
}
