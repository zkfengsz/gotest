import { Navbar } from "@/components/layout/navbar";
import { requireAuth } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "D&B AI 学习平台",
  description: "企业 AI 基础知识学习与认证考试",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();

  return (
    <>
      <Navbar profile={profile} />
      <main className="flex-1 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
      </main>
    </>
  );
}
