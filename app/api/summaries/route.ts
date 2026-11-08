import { NextRequest, NextResponse } from "next/server";
import { summarizeNews } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 || ids.some((id) => typeof id !== "string" || !/^\d+$/.test(id))) {
    return NextResponse.json({ error: "请选择当前列表中的有效动态生成摘要。" }, { status: 400 });
  }
  if (!process.env.NVIDIA_API_KEY?.trim()) {
    return NextResponse.json({ error: "请先在 .env.local 配置 NVIDIA_API_KEY，并重启服务。" }, { status: 503 });
  }

  try {
    const result = await summarizeNews(ids);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "摘要生成失败，请重试。";
    return NextResponse.json({ error: message }, { status: message.startsWith("动态列表") ? 409 : 502 });
  }
}
