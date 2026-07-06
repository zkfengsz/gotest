import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireAuth } from "@/lib/auth";
import {
  STAGE_DESCRIPTIONS,
  STAGE_LABELS,
  TOTAL_STAGES,
} from "@/lib/constants";
import { readDb } from "@/lib/local-db";
import { Award, BookOpen, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const profile = await requireAuth();
  const db = await readDb();
  const progressList = db.learning_progress.filter((p) => p.user_id === profile.id);

  const stages = Array.from({ length: TOTAL_STAGES }, (_, i) => i + 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#003366]">
          欢迎回来，{profile.full_name ?? "学员"}
        </h1>
        <p className="text-muted-foreground mt-1">
          按顺序完成三个阶段的学习与考试，获取 AI 基础知识认证
        </p>
      </div>

      {profile.max_passed_stage >= TOTAL_STAGES && (
        <Card className="border-[#C5A572]/30 bg-gradient-to-r from-amber-50 to-white">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <Award className="h-10 w-10 text-[#C5A572]" />
              <div>
                <p className="font-semibold text-[#003366]">恭喜完成全部学习！</p>
                <p className="text-sm text-muted-foreground">您已获得结业证书</p>
              </div>
            </div>
            <Button
              nativeButton={false}
              render={<Link href="/certificate" />}
              className="bg-[#003366] hover:bg-[#002244]"
            >
              查看证书
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {stages.map((stageId) => {
          const isUnlocked = stageId <= profile.current_stage;
          const isPassed = stageId <= profile.max_passed_stage;
          const progress = progressList?.find((p) => p.stage_id === stageId);
          const viewedCount = progress?.viewed_question_ids?.length ?? 0;
          const learningDone = progress?.learning_completed ?? false;

          return (
            <Card
              key={stageId}
              className={`relative overflow-hidden transition-shadow hover:shadow-lg ${
                !isUnlocked ? "opacity-60" : ""
              }`}
            >
              {isPassed && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  {!isUnlocked ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <BookOpen className="h-4 w-4 text-[#003366]" />
                  )}
                  <Badge variant={isPassed ? "default" : "secondary"}>
                    Stage {stageId}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{STAGE_LABELS[stageId]}</CardTitle>
                <CardDescription>{STAGE_DESCRIPTIONS[stageId]}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isUnlocked && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        学习进度 {viewedCount}/100
                      </p>
                      <Progress value={Math.min(viewedCount, 100)} className="h-1.5" />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        nativeButton={false}
                        render={<Link href={`/learn/${stageId}`} />}
                        className="flex-1 bg-[#003366] hover:bg-[#002244]"
                        disabled={!isUnlocked}
                      >
                        {learningDone ? "复习" : "开始学习"}
                      </Button>
                      {learningDone && !isPassed && (
                        <Button
                          nativeButton={false}
                          render={<Link href={`/learn/${stageId}/exam`} />}
                          variant="outline"
                          className="flex-1"
                        >
                          考试
                        </Button>
                      )}
                    </div>
                  </>
                )}
                {!isUnlocked && (
                  <p className="text-sm text-muted-foreground">
                    请先通过 Stage {stageId - 1} 的考试
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
