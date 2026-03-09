import { NextRequest } from "next/server";
import { GET as getSandbox } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return getSandbox(request);
}
