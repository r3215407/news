import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "讯哨 · 新闻监控",
  description: "追踪账号动态，汇总尚未播报的消息。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
