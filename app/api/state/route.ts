import { NextResponse } from "next/server";
import { publicState } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(publicState(), { headers: { "Cache-Control": "no-store" } });
}
