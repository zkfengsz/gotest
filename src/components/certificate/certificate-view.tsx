"use client";

import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/database";
import html2canvas from "html2canvas";
import { Award, Download } from "lucide-react";
import { useRef } from "react";

interface CertificateViewProps {
  profile: Profile;
}

export function CertificateView({ profile }: CertificateViewProps) {
  const certRef = useRef<HTMLDivElement>(null);

  async function downloadCertificate() {
    if (!certRef.current) return;
    const canvas = await html2canvas(certRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const link = document.createElement("a");
    link.download = `D&B-AI-Certificate-${profile.email.split("@")[0]}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  const date = profile.certificate_issued_at
    ? new Date(profile.certificate_issued_at).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("zh-CN");

  return (
    <div className="space-y-6">
      <div
        ref={certRef}
        className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f0f4f8 50%, #e8eef5 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-5">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                #003366 0,
                #003366 1px,
                transparent 0,
                transparent 50%
              )`,
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <div className="relative border-[12px] border-double border-[#003366]/20 m-4 p-10 md:p-16">
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#003366] text-white font-bold text-sm">
                D&B
              </div>
              <span className="text-sm font-semibold text-[#003366] tracking-wide">
                Dun & Bradstreet
              </span>
            </div>
            <Award className="h-8 w-8 text-[#C5A572]" />
          </div>

          <div className="text-center mt-8">
            <p className="text-sm uppercase tracking-[0.3em] text-[#003366]/60 mb-2">
              Certificate of Completion
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-[#003366] mb-2">
              结业证书
            </h1>
            <div className="mx-auto h-1 w-24 bg-gradient-to-r from-transparent via-[#C5A572] to-transparent mb-8" />

            <p className="text-muted-foreground mb-6">兹证明</p>
            <p className="text-2xl md:text-3xl font-bold text-[#003366] mb-2">
              {profile.full_name ?? profile.email.split("@")[0]}
            </p>
            <p className="text-sm text-muted-foreground mb-8">{profile.email}</p>

            <p className="text-base leading-relaxed text-foreground/80 max-w-lg mx-auto mb-8">
              已完成 <strong>D&B 企业 AI 基础知识学习项目</strong> 全部三个阶段
              （AI 基础认知、AI 工具应用、AI 场景实战）的学习与考试，
              成绩合格，特发此证。
            </p>

            <div className="flex items-center justify-center gap-12 mt-10">
              <div className="text-center">
                <div className="h-px w-32 bg-[#003366]/30 mb-2" />
                <p className="text-xs text-muted-foreground">颁发日期</p>
                <p className="text-sm font-medium text-[#003366]">{date}</p>
              </div>
              <div className="text-center">
                <div className="font-serif text-2xl italic text-[#003366]/70 mb-1">
                  D&B Learning
                </div>
                <p className="text-xs text-muted-foreground">认证机构</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={downloadCertificate}
          className="bg-[#003366] hover:bg-[#002244] gap-2"
          size="lg"
        >
          <Download className="h-4 w-4" />
          下载证书图片
        </Button>
      </div>
    </div>
  );
}
