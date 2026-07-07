"use client";

import { signOut } from "@/app/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Profile } from "@/types/database";
import { Brain, LayoutDashboard, LogOut, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface NavbarProps {
  profile: Profile;
}

export function Navbar({ profile }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const initials = (profile.full_name ?? profile.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="relative h-9 w-9 rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-[#003366] text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
              role="menu"
            >
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile.full_name ?? "用户"}</p>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
              </div>
              <div className="-mx-1 my-1 h-px bg-border" />
              <Link
                href="/dashboard"
                className="relative flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4" />
                学习中心
              </Link>
              {profile.role === "admin" && (
                <Link
                  href="/admin"
                  className="relative flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  管理后台
                </Link>
              )}
              {profile.role === "admin" && (
                <Link
                  href="/admin/users"
                  className="relative flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <Users className="h-4 w-4" />
                  用户管理
                </Link>
              )}
              <div className="-mx-1 my-1 h-px bg-border" />
              <button
                type="button"
                className="relative flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm text-destructive outline-hidden select-none hover:bg-destructive/10"
                onClick={() => signOut()}
                role="menuitem"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
