"use client";

import {
  createUserAccount,
  resetUserPassword,
  updateUserRole,
} from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExamRecord, LearningProgress, Profile } from "@/types/database";
import { useState } from "react";
import { toast } from "sonner";

interface UserTableProps {
  profiles: Profile[];
  progress: LearningProgress[];
  exams: ExamRecord[];
}

export function UserTable({ profiles, progress, exams }: UserTableProps) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  async function handleRoleChange(userId: string, role: "admin" | "user") {
    const result = await updateUserRole(userId, role);
    if (result.error) toast.error(result.error);
    else toast.success("角色已更新");
  }

  async function handleCreateUser() {
    const result = await createUserAccount(username, password, fullName);
    if (result.error) return toast.error(result.error);
    toast.success("用户已创建");
    setUsername("");
    setFullName("");
    setPassword("");
  }

  async function handleResetPassword(userId: string) {
    const newPassword = window.prompt("请输入新密码（至少 6 位）");
    if (!newPassword) return;
    const result = await resetUserPassword(userId, newPassword);
    if (result.error) return toast.error(result.error);
    toast.success("密码已重置");
  }

  function getUserProgress(userId: string) {
    const stages = progress.filter((p) => p.user_id === userId);
    const completed = stages.filter((s) => s.learning_completed).length;
    const current = stages.length > 0
      ? Math.max(...stages.map((s) => s.stage_id))
      : 1;
    return { completed, current };
  }

  function getUserExams(userId: string) {
    return exams.filter((e) => e.user_id === userId);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 bg-slate-50/60">
        <p className="text-sm font-medium mb-3">创建用户（用户名 + 密码）</p>
        <div className="grid gap-2 md:grid-cols-4">
          <Input
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            placeholder="姓名（可选）"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            placeholder="初始密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            className="bg-[#003366] hover:bg-[#002244]"
            onClick={handleCreateUser}
          >
            新建用户
          </Button>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">用户（用户名）</th>
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
                  <div className="flex gap-2">
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
                      variant="outline"
                      className="h-8"
                      onClick={() => handleResetPassword(p.id)}
                    >
                      重置密码
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {profiles.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">暂无用户</p>
      )}
    </div>
    </div>
  );
}
