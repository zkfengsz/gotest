import { Navbar } from "@/components/layout/navbar";
import { requireAdmin } from "@/lib/auth";
import { BookOpen, LayoutDashboard, Mail, Users } from "lucide-react";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  return (
    <>
      <Navbar profile={profile} />
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl gap-6 px-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 border-b-2 border-transparent py-3 text-sm font-medium text-muted-foreground hover:text-[#003366] [&.active]:border-[#003366] [&.active]:text-[#003366]"
          >
            <LayoutDashboard className="h-4 w-4" />
            概览
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-2 border-b-2 border-transparent py-3 text-sm font-medium text-muted-foreground hover:text-[#003366]"
          >
            <Users className="h-4 w-4" />
            用户管理
          </Link>
          <Link
            href="/admin/email-allowlist"
            className="flex items-center gap-2 border-b-2 border-transparent py-3 text-sm font-medium text-muted-foreground hover:text-[#003366]"
          >
            <Mail className="h-4 w-4" />
            邮箱白名单
          </Link>
          <Link
            href="/admin/questions"
            className="flex items-center gap-2 border-b-2 border-transparent py-3 text-sm font-medium text-muted-foreground hover:text-[#003366]"
          >
            <BookOpen className="h-4 w-4" />
            题库管理
          </Link>
        </div>
      </div>
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
      </main>
    </>
  );
}
