"use server";

import {
  EXAM_QUESTION_COUNT,
  QUESTIONS_PER_STAGE,
  TOTAL_STAGES,
} from "@/lib/constants";
import { scoreExam, shuffleArray } from "@/lib/exam";
import { requireAuth } from "@/lib/auth";
import { mutateDb, readDb } from "@/lib/local-db";
import type { Question, UserAnswer } from "@/types/database";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

export async function markQuestionViewed(stageId: number, questionId: string) {
  const profile = await requireAuth();

  let learningCompleted = false;

  await mutateDb((db) => {
    const existing = db.learning_progress.find(
      (p) => p.user_id === profile.id && p.stage_id === stageId
    );

    const viewed = existing?.viewed_question_ids ?? [];
    if (viewed.includes(questionId)) {
      learningCompleted = existing?.learning_completed ?? false;
      return;
    }

    const newViewed = [...viewed, questionId];

    const count = db.questions.filter(
      (q) => q.stage_id === stageId && q.is_active
    ).length;

    learningCompleted =
      count >= QUESTIONS_PER_STAGE && newViewed.length >= count;

    if (existing) {
      existing.viewed_question_ids = newViewed;
      existing.learning_completed = learningCompleted;
      existing.learning_completed_at = learningCompleted
        ? new Date().toISOString()
        : null;
      existing.updated_at = new Date().toISOString();
    } else {
      db.learning_progress.push({
        id: randomUUID(),
        user_id: profile.id,
        stage_id: stageId,
        viewed_question_ids: newViewed,
        learning_completed: learningCompleted,
        learning_completed_at: learningCompleted
          ? new Date().toISOString()
          : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  });

  revalidatePath(`/learn/${stageId}`);
  return { success: true, learningCompleted };
}

export async function startExam(stageId: number) {
  const profile = await requireAuth();

  if (stageId > profile.current_stage) {
    return { error: "请先完成上一阶段的学习与考试" };
  }

  const db = await readDb();
  const progress = db.learning_progress.find(
    (p) => p.user_id === profile.id && p.stage_id === stageId
  );

  if (!progress?.learning_completed) {
    return { error: "请先完成本阶段全部 100 题的学习" };
  }

  const inProgress = db.exam_records.find(
    (e) =>
      e.user_id === profile.id &&
      e.stage_id === stageId &&
      e.status === "in_progress"
  );

  if (inProgress) {
    return { examId: inProgress.id };
  }

  const allQuestions = db.questions
    .filter((q) => q.stage_id === stageId && q.is_active)
    .map((q) => ({ id: q.id }));

  if (!allQuestions || allQuestions.length < EXAM_QUESTION_COUNT) {
    return { error: `题库不足，需要至少 ${EXAM_QUESTION_COUNT} 道题目` };
  }

  const selected = shuffleArray(allQuestions)
    .slice(0, EXAM_QUESTION_COUNT)
    .map((q) => q.id);

  const examId = randomUUID();

  await mutateDb((db) => {
    db.exam_records.push({
      id: examId,
      user_id: profile.id,
      stage_id: stageId,
      question_ids: selected,
      answers: {},
      total_questions: EXAM_QUESTION_COUNT,
      correct_count: 0,
      score: 0,
      passed: false,
      status: "in_progress",
      started_at: new Date().toISOString(),
      completed_at: null,
      created_at: new Date().toISOString(),
    });
  });

  return { examId };
}

export async function submitExam(
  examId: string,
  answers: Record<string, UserAnswer>
) {
  const profile = await requireAuth();

  const holder: {
    result?: {
      correctCount: number;
      total: number;
      score: number;
      passed: boolean;
      stageId: number;
    };
  } = {};

  try {
    await mutateDb((db) => {
      const exam = db.exam_records.find(
        (e) =>
          e.id === examId &&
          e.user_id === profile.id &&
          e.status === "in_progress"
      );

      if (!exam) throw new Error("考试记录不存在或已提交");

      const questions = db.questions.filter((q) =>
        exam.question_ids.includes(q.id)
      );

      const ordered = exam.question_ids
        .map((id: string) => questions.find((q) => q.id === id))
        .filter(Boolean) as Question[];

      const scored = scoreExam(ordered, answers);

      exam.answers = answers;
      exam.correct_count = scored.correctCount;
      exam.score = scored.score;
      exam.passed = scored.passed;
      exam.status = "completed";
      exam.completed_at = new Date().toISOString();

      if (scored.passed) {
        const newMaxPassed = Math.max(profile.max_passed_stage, exam.stage_id);
        const newCurrentStage = Math.min(exam.stage_id + 1, TOTAL_STAGES + 1);
        const user = db.users.find((u) => u.id === profile.id);
        if (user) {
          user.max_passed_stage = newMaxPassed;
          user.current_stage = Math.max(
            user.current_stage,
            newCurrentStage > TOTAL_STAGES ? TOTAL_STAGES : newCurrentStage
          );
          if (newMaxPassed === TOTAL_STAGES && !user.certificate_issued_at) {
            user.certificate_issued_at = new Date().toISOString();
          }
          user.updated_at = new Date().toISOString();
        }
      }

      holder.result = {
        correctCount: scored.correctCount,
        total: ordered.length,
        score: scored.score,
        passed: scored.passed,
        stageId: exam.stage_id,
      };
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "考试提交失败",
    };
  }

  if (!holder.result) {
    return { error: "考试提交失败" };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/learn/${holder.result.stageId}`);
  return {
    correctCount: holder.result.correctCount,
    total: holder.result.total,
    score: holder.result.score,
    passed: holder.result.passed,
  };
}
