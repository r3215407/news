import { NextResponse } from "next/server";
import { checkNews } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const failedOnly = new URL(request.url).searchParams.get("failedOnly") === "1";
  return NextResponse.json(await checkNews(failedOnly), { headers: { "Cache-Control": "no-store" } });
}
