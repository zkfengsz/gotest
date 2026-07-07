"use client";

import {
  hardDeleteUser,
  restoreUser,
  softDeleteUser,
  updateUserRole,
} from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExamRecord, LearningProgress, Profile } from "@/types/database";
import { toast } from "sonner";

interface UserTableProps {
  profiles: Profile[];
  progress: LearningProgress[];
  exams: ExamRecord[];
}

export function UserTable({ profiles, progress, exams }: UserTableProps) {
  async function handleRoleChange(userId: string, role: "admin" | "user") {
    const result = await updateUserRole(userId, role);
    if (result.error) toast.error(result.error);
    else toast.success("角色已更新");
  }

  async function handleSoftDelete(userId: string) {
    const ok = window.confirm("确认软删除该账号？软删除后账号不可登录，但学习/考试记录会保留。");
    if (!ok) return;
    const result = await softDeleteUser(userId);
    if (result.error) toast.error(result.error);
    else toast.success("账号已禁用（软删除）");
  }

  async function handleHardDelete(userId: string) {
    const ok = window.confirm(
      "确认硬删除该账号？这会永久删除该用户及其学习进度与考试记录，无法恢复。"
    );
    if (!ok) return;
    const result = await hardDeleteUser(userId);
    if (result.error) toast.error(result.error);
    else toast.success("账号已永久删除");
  }

  async function handleRestore(userId: string) {
    const result = await restoreUser(userId);
    if (result.error) toast.error(result.error);
    else toast.success("账号已恢复，可重新登录");
  }

  function getUserProgress(userId: string) {
    const stages = progress.filter((p) => p.user_id === userId);
    const completed = stages.filter((s) => s.learning_completed).length;
    return { completed };
  }

  function getUserExams(userId: string) {
    return exams.filter((e) => e.user_id === userId);
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">用户</th>
            <th className="px-4 py-3 text-left font-medium">角色</th>
            <th className="px-4 py-3 text-left font-medium">当前阶段</th>
            <th className="px-4 py-3 text-left font-medium">已通过阶段</th>
            <th className="px-4 py-3 text-left font-medium">考试记录</th>
            <th className="px-4 py-3 text-left font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {profiles.map((p) => {
            const { completed } = getUserProgress(p.id);
            const userExams = getUserExams(p.id);

            return (
              <tr key={p.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{p.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={p.role === "admin" ? "default" : "secondary"}>
                    {p.role === "admin" ? "管理员" : "用户"}
                  </Badge>
                  {p.is_disabled ? (
                    <Badge variant="outline" className="ml-2 text-destructive border-destructive">
                      已禁用
                    </Badge>
                  ) : null}
                </td>
                <td className="px-4 py-3">Stage {p.current_stage}</td>
                <td className="px-4 py-3">
                  {p.max_passed_stage}/3
                  <span className="text-xs text-muted-foreground ml-1">
                    (学习完成 {completed} 组)
                  </span>
                </td>
                <td className="px-4 py-3">
                  {userExams.length === 0 ? (
                    <span className="text-muted-foreground">暂无</span>
                  ) : (
                    <div className="space-y-1">
                      {userExams.slice(0, 3).map((e) => (
                        <div key={e.id} className="text-xs">
                          S{e.stage_id}: {(e.score * 100).toFixed(0)}%
                          {e.passed ? " ✓" : " ✗"}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Select
                      value={p.role}
                      onValueChange={(v) =>
                        v && handleRoleChange(p.id, v as "admin" | "user")
                      }
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">用户</SelectItem>
                        <SelectItem value="admin">管理员</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => handleSoftDelete(p.id)}
                      disabled={p.is_disabled}
                    >
                      软删除
                    </Button>
                    {p.is_disabled ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8"
                        onClick={() => handleRestore(p.id)}
                      >
                        恢复账号
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8"
                      onClick={() => handleHardDelete(p.id)}
                    >
                      硬删除
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {profiles.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          暂无用户，用户通过邮箱验证码登录后将自动出现在此列表
        </p>
      )}
    </div>
  );
}
