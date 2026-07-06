"use client";

import { signOut } from "@/app/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/types/database";
import { Brain, LayoutDashboard, LogOut, Settings, Users } from "lucide-react";
import Link from "next/link";

interface NavbarProps {
  profile: Profile;
}

export function Navbar({ profile }: NavbarProps) {
  const initials = (profile.full_name ?? profile.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#003366] text-white">
            <Brain className="h-5 w-5" />
          </div>
          <span className="font-semibold text-[#003366]">D&B AI 学习平台</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-[#003366]"
          >
            学习中心
          </Link>
          {profile.max_passed_stage >= 3 && (
            <Link
              href="/certificate"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-[#003366]"
            >
              结业证书
            </Link>
          )}
          {profile.role === "admin" && (
            <Link
              href="/admin"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-[#003366]"
            >
              管理后台
            </Link>
          )}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative h-9 w-9 rounded-full outline-none"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-[#003366] text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{profile.full_name ?? "用户"}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/dashboard" />}>
              <LayoutDashboard className="h-4 w-4" />
              学习中心
            </DropdownMenuItem>
            {profile.role === "admin" && (
              <DropdownMenuItem render={<Link href="/admin" />}>
                <Settings className="h-4 w-4" />
                管理后台
              </DropdownMenuItem>
            )}
            {profile.role === "admin" && (
              <DropdownMenuItem render={<Link href="/admin/users" />}>
                <Users className="h-4 w-4" />
                用户管理
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
