import { normalizeEmail } from "@/lib/email-access";
import cloudbase from "@cloudbase/node-sdk";

let adminApp: ReturnType<typeof cloudbase.init> | null = null;

function getCloudBaseAdmin() {
  const envId = process.env.NEXT_PUBLIC_TCB_ENV_ID;
  if (!envId) return null;

  if (!adminApp) {
    const secretId = process.env.TENCENTCLOUD_SECRETID;
    const secretKey = process.env.TENCENTCLOUD_SECRETKEY;
    const accessKey = process.env.CLOUDBASE_APIKEY;

    if (!secretId && !secretKey && !accessKey) {
      return null;
    }

    adminApp = cloudbase.init({
      env: envId,
      ...(secretId && secretKey
        ? { secretId, secretKey }
        : { accessKey: accessKey! }),
    });
  }

  return adminApp;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function fetchCurrentUser(accessToken: string): Promise<{
  id: string;
  email?: string;
} | null> {
  const envId = process.env.NEXT_PUBLIC_TCB_ENV_ID;
  if (!envId) return null;

  const region = process.env.NEXT_PUBLIC_TCB_REGION ?? "ap-shanghai";
  const urls = [
    `https://${envId}.api.tcloudbasegateway.com/auth/v1/user`,
    `https://${envId}.${region}.tcb-api.tencentcloudapi.com/auth/v1/user`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
      if (!res.ok) continue;

      const data = (await res.json()) as Record<string, unknown>;
      const user = (data.user ?? data) as Record<string, unknown>;
      const id = String(user.id ?? user.uid ?? user.sub ?? "");
      if (!id) continue;

      return {
        id,
        email: user.email ? String(user.email) : undefined,
      };
    } catch {
      // try next endpoint
    }
  }

  return null;
}

export async function verifyAccessToken(
  accessToken: string,
  expectedUid: string,
  expectedEmail: string
): Promise<boolean> {
  if (!accessToken || !expectedUid || !expectedEmail) return false;

  const normalizedEmail = normalizeEmail(expectedEmail);
  if (!normalizedEmail) return false;

  const apiUser = await fetchCurrentUser(accessToken);
  if (apiUser) {
    return (
      apiUser.id === expectedUid &&
      (!apiUser.email ||
        normalizeEmail(apiUser.email) === normalizedEmail)
    );
  }

  const payload = decodeJwtPayload(accessToken);
  if (!payload) return false;

  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  if (exp > 0 && exp * 1000 < Date.now()) return false;

  const uid = String(payload.sub ?? payload.uid ?? payload.user_id ?? "");
  if (uid !== expectedUid) return false;

  const envId = process.env.NEXT_PUBLIC_TCB_ENV_ID;
  const tokenEnv = payload.env ?? payload.env_id ?? payload.aud;
  if (
    envId &&
    tokenEnv &&
    String(tokenEnv) !== envId &&
    !String(tokenEnv).includes(envId)
  ) {
    return false;
  }

  const tokenEmail = payload.email ? String(payload.email) : undefined;
  if (tokenEmail && normalizeEmail(tokenEmail) !== normalizedEmail) {
    return false;
  }

  const admin = getCloudBaseAdmin();
  if (admin) {
    try {
      const result = await admin.auth().getEndUserInfo(expectedUid);
      const userInfo = result?.userInfo ?? result?.data;
      if (userInfo?.uid && userInfo.uid !== expectedUid) return false;
    } catch {
      // JWT checks above are sufficient when admin API is unavailable
    }
  }

  return true;
}
