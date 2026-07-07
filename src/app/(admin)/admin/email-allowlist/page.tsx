import { getEmailAllowlist } from "@/app/actions/admin";
import { EmailAllowlistManager } from "@/components/admin/email-allowlist-manager";

export default async function AdminEmailAllowlistPage() {
  const entries = await getEmailAllowlist();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#003366]">邮箱白名单</h1>
        <p className="text-muted-foreground mt-1">
          管理允许注册/登录的外部邮箱，移除后该邮箱将无法再获取验证码（已注册用户不受影响）
        </p>
      </div>
      <EmailAllowlistManager entries={entries} />
    </div>
  );
}
