import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllUsers, getQuestions } from "@/app/actions/admin";
import { getDailyAiCallCount, isRedisConfigured } from "@/lib/ai-quota";
import { BookOpen, ClipboardList, Sparkles, Users } from "lucide-react";

export default async function AdminDashboardPage() {
  const { profiles } = await getAllUsers();
  const questions = await getQuestions();
  const dailyAiCalls = await getDailyAiCallCount();

  const stageCounts = [1, 2, 3].map(
    (s) => questions.filter((q) => q.stage_id === s).length
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#003366]">管理后台</h1>
        <p className="text-muted-foreground mt-1">用户学习与题库管理</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">注册用户</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{profiles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">题库总量</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{questions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              S1: {stageCounts[0]} · S2: {stageCounts[1]} · S3: {stageCounts[2]}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">每阶段目标</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">100</p>
            <p className="text-xs text-muted-foreground mt-1">题/阶段 · 考试抽 60 题</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">今日 AI 调用</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dailyAiCalls}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isRedisConfigured()
                ? "Upstash 统计 · 每题上限见环境变量"
                : "未配置 Upstash，生产环境请配置"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
