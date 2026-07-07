"use client";

import cloudbase from "@cloudbase/js-sdk";

let app: ReturnType<typeof cloudbase.init> | null = null;

export function getCloudBaseAuth() {
  const envId = process.env.NEXT_PUBLIC_TCB_ENV_ID;
  if (!envId) {
    throw new Error("未配置 NEXT_PUBLIC_TCB_ENV_ID");
  }

  if (!app) {
    const accessKey = process.env.NEXT_PUBLIC_TCB_ACCESS_KEY;
    app = cloudbase.init({
      env: envId,
      region: process.env.NEXT_PUBLIC_TCB_REGION ?? "ap-shanghai",
      ...(accessKey ? { accessKey } : {}),
    });
  }

  return app.auth();
}
