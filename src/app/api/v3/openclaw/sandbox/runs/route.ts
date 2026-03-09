import { NextRequest } from "next/server";
import { GET as getSandbox, POST as postSandbox } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return getSandbox(request);
}

export async function POST(request: NextRequest) {
  return postSandbox(request);
}
