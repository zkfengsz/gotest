"use client";

import dynamic from "next/dynamic";

export const LoginForm = dynamic(
  () => import("./login-form").then((mod) => mod.LoginForm),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        加载登录页...
      </div>
    ),
  }
);
