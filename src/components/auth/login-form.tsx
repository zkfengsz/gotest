"use client";

import {
  completeEmailLogin,
  validateEmailAccess,
} from "@/app/actions/auth";
import { getCloudBaseAuth } from "@/lib/cloudbase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type OtpVerifier = {
  verifyOtp: (params: { token: string }) => Promise<{
    data?: {
      user?: { id?: string; email?: string };
      session?: { access_token?: string };
    };
    error?: { message?: string };
  }>;
};

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpVerifier, setOtpVerifier] = useState<OtpVerifier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const validation = await validateEmailAccess(email);
    if (validation.error) {
      setLoading(false);
      setError(validation.error);
      return;
    }

    try {
      const auth = getCloudBaseAuth();
      const { data, error: otpError } = await auth.signInWithOtp({
        email: validation.email,
      });

      if (otpError) {
        setError(otpError.message ?? "验证码发送失败");
        setLoading(false);
        return;
      }

      if (!data?.verifyOtp) {
        setError("验证码服务不可用，请稍后重试");
        setLoading(false);
        return;
      }

      setOtpVerifier(data as OtpVerifier);
      setStep("code");
    } catch {
      setError("CloudBase 未配置或网络异常，请检查环境变量");
    }

    setLoading(false);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!otpVerifier) {
      setError("请先获取验证码");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const { data, error: verifyError } = await otpVerifier.verifyOtp({
        token: code.trim(),
      });

      if (verifyError) {
        setError(verifyError.message ?? "验证码错误或已过期");
        setLoading(false);
        return;
      }

      const accessToken = data?.session?.access_token;
      const uid = data?.user?.id;
      const userEmail = data?.user?.email ?? email;

      if (!accessToken || !uid) {
        setError("登录响应不完整，请重试");
        setLoading(false);
        return;
      }

      const result = await completeEmailLogin({
        accessToken,
        uid,
        email: userEmail,
      });

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push(result.role === "admin" ? "/admin" : "/dashboard");
      router.refresh();
    } catch {
      setError("登录失败，请重试");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#003366] text-white">
            <Brain className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-[#003366]">
              D&B AI 学习平台
            </CardTitle>
            <CardDescription className="mt-2">
              使用企业邮箱验证码登录，首次验证自动注册
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">企业邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@dnb.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  仅允许指定域名或白名单内的邮箱注册/登录
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#003366] hover:bg-[#002244]"
                disabled={loading}
              >
                {loading ? "发送中..." : "获取验证码"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
                验证码已发送至 <span className="font-medium text-foreground">{email}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">验证码</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="请输入 6 位验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="pl-10 tracking-widest"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#003366] hover:bg-[#002244]"
                disabled={loading}
              >
                {loading ? "验证中..." : "登录"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={loading}
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setOtpVerifier(null);
                  setError("");
                }}
              >
                更换邮箱
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
