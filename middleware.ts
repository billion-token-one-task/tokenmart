import { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/update-session";

export async function middleware(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
