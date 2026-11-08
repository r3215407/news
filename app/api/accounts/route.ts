import { NextRequest, NextResponse } from "next/server";
import { addAccount, publicState, removeAccount } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const result = addAccount(typeof body?.handle === "string" ? body.handle : "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(publicState(), { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (typeof body?.handle !== "string" || !removeAccount(body.handle)) {
    return NextResponse.json({ error: "未找到这个监控账号。" }, { status: 404 });
  }
  return NextResponse.json(publicState());
}
