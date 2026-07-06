import { CertificateView } from "@/components/certificate/certificate-view";
import { requireAuth } from "@/lib/auth";
import { TOTAL_STAGES } from "@/lib/constants";
import { redirect } from "next/navigation";

export default async function CertificatePage() {
  const profile = await requireAuth();

  if (profile.max_passed_stage < TOTAL_STAGES) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#003366]">结业证书</h1>
        <p className="text-muted-foreground mt-1">
          恭喜您完成全部 AI 基础知识学习与考试
        </p>
      </div>
      <CertificateView profile={profile} />
    </div>
  );
}
