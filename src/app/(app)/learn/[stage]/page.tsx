import { ensureLearningQuestionOrder } from "@/app/actions/learning";
import { LearnClient } from "@/components/learn/learn-client";
import { requireAuth } from "@/lib/auth";
import { STAGE_LABELS } from "@/lib/constants";
import { readDb } from "@/lib/local-db";
import { orderQuestionsByIds } from "@/lib/question-order";
import { notFound, redirect } from "next/navigation";

interface Props {
  params: Promise<{ stage: string }>;
}

export default async function LearnPage({ params }: Props) {
  const { stage } = await params;
  const stageId = Number(stage);
  if (stageId < 1 || stageId > 3) notFound();

  const profile = await requireAuth();
  if (stageId > profile.current_stage) redirect("/dashboard");

  const db = await readDb();
  const stageQuestions = db.questions.filter(
    (q) => q.stage_id === stageId && q.is_active
  );
  const questionOrder = await ensureLearningQuestionOrder(
    profile.id,
    stageId,
    stageQuestions.map((q) => q.id)
  );
  const questions = orderQuestionsByIds(stageQuestions, questionOrder);
  const latestDb = await readDb();
  const progress =
    latestDb.learning_progress.find(
      (p) => p.user_id === profile.id && p.stage_id === stageId
    ) ?? null;

  return (
    <div className="space-y-6 -mx-2 sm:mx-0">
      <div>
        <h1 className="text-2xl font-bold text-[#003366]">
          {STAGE_LABELS[stageId]}
        </h1>
        <p className="text-muted-foreground mt-1">
          学习模式 · 题目顺序已为你随机排列
        </p>
      </div>
      <LearnClient
        stageId={stageId}
        questions={questions}
        progress={progress}
        canTakeExam={stageId <= profile.current_stage}
      />
    </div>
  );
}
