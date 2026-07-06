import { ExamClient } from "@/components/learn/exam-client";
import { startExam } from "@/app/actions/learning";
import { requireAuth } from "@/lib/auth";
import { STAGE_LABELS } from "@/lib/constants";
import { readDb } from "@/lib/local-db";
import type { Question } from "@/types/database";
import { notFound, redirect } from "next/navigation";

interface Props {
  params: Promise<{ stage: string }>;
}

export default async function ExamPage({ params }: Props) {
  const { stage } = await params;
  const stageId = Number(stage);
  if (stageId < 1 || stageId > 3) notFound();

  const profile = await requireAuth();
  if (stageId > profile.current_stage) redirect("/dashboard");

  const db = await readDb();
  const progress = db.learning_progress.find(
    (p) => p.user_id === profile.id && p.stage_id === stageId
  );

  if (!progress?.learning_completed) {
    redirect(`/learn/${stageId}`);
  }

  let examId: string | undefined;

  const existing = db.exam_records.find(
    (e) =>
      e.user_id === profile.id &&
      e.stage_id === stageId &&
      e.status === "in_progress"
  );

  if (existing) {
    examId = existing.id;
  } else {
    const result = await startExam(stageId);
    if (result.error) {
      return (
        <div className="text-center py-20">
          <p className="text-destructive">{result.error}</p>
        </div>
      );
    }
    examId = result.examId;
  }

  const latestDb = await readDb();
  const exam = latestDb.exam_records.find((e) => e.id === examId!);

  if (!exam) notFound();

  const questions = latestDb.questions.filter((q) =>
    exam.question_ids.includes(q.id)
  );

  const ordered = exam.question_ids
    .map((id: string) => questions.find((q) => q.id === id))
    .filter(Boolean) as Question[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#003366]">
          {STAGE_LABELS[stageId]} · 考试
        </h1>
        <p className="text-muted-foreground mt-1">随机 60 题 · 90% 正确率通关</p>
      </div>
      <ExamClient exam={exam} questions={ordered} stageId={stageId} />
    </div>
  );
}
