"use client";

import {
  addAllowlistEmail,
  removeAllowlistEmail,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EmailAllowlistEntry } from "@/types/database";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface EmailAllowlistManagerProps {
  entries: EmailAllowlistEntry[];
}

export function EmailAllowlistManager({ entries }: EmailAllowlistManagerProps) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    setLoading(true);
    const result = await addAllowlistEmail(email, note);
    setLoading(false);

    if (result.error) return toast.error(result.error);
    toast.success("已添加到白名单");
    setEmail("");
    setNote("");
  }

  async function handleRemove(entryEmail: string) {
    const result = await removeAllowlistEmail(entryEmail);
    if (result.error) return toast.error(result.error);
    toast.success("已从白名单移除");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 bg-slate-50/60">
        <p className="text-sm font-medium mb-3">添加邮箱白名单</p>
        <p className="text-xs text-muted-foreground mb-3">
          动态白名单与域名后缀（DNB_EMAIL_DOMAINS）、环境变量白名单（DNB_EMAIL_WHITELIST）为 OR 关系，满足任一即可登录。
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          <Input
            placeholder="完整邮箱，如 partner@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            placeholder="备注（可选）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            className="bg-[#003366] hover:bg-[#002244]"
            onClick={handleAdd}
            disabled={loading || !email.trim()}
          >
            添加
          </Button>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">邮箱</th>
              <th className="px-4 py-3 text-left font-medium">备注</th>
              <th className="px-4 py-3 text-left font-medium">添加时间</th>
              <th className="px-4 py-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry) => (
              <tr key={entry.email} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium">{entry.email}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {entry.note ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString("zh-CN")}
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(entry.email)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    移除
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            暂无动态白名单条目
          </p>
        )}
      </div>
    </div>
  );
}
