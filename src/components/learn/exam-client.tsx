"use client";

import { submitExam } from "@/app/actions/learning";
import { QuestionDisplay } from "@/components/questions/question-display";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PASS_THRESHOLD } from "@/lib/constants";
import type { ExamRecord, Question, UserAnswer } from "@/types/database";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface ExamClientProps {
  exam: ExamRecord;
  questions: Question[];
  stageId: number;
}

export function ExamClient({ exam, questions, stageId }: ExamClientProps) {
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>(
    (exam.answers as Record<string, UserAnswer>) ?? {}
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    correctCount: number;
    total: number;
    score: number;
    passed: boolean;
  } | null>(null);

  const current = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = (answeredCount / questions.length) * 100;

  function setAnswer(questionId: string, value: UserAnswer) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    if (answeredCount < questions.length) {
      if (!confirm(`还有 ${questions.length - answeredCount} 题未作答，确定提交？`)) return;
    }
    setSubmitting(true);
    const res = await submitExam(exam.id, answers);
    setSubmitting(false);
    if ("error" in res && res.error) {
      alert(res.error);
      return;
    }
    if ("correctCount" in res && res.correctCount !== undefined) {
      setResult({
        correctCount: res.correctCount,
        total: res.total!,
        score: res.score!,
        passed: res.passed!,
      });
    }
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-12">
        {result.passed ? (
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        ) : (
          <XCircle className="h-16 w-16 text-red-500 mx-auto" />
        )}
        <h2 className="text-2xl font-bold">
          {result.passed ? "恭喜通过！" : "未通过考试"}
        </h2>
        <p className="text-muted-foreground">
          正确 {result.correctCount}/{result.total} 题 · 得分 {(result.score * 100).toFixed(1)}%
        </p>
        {!result.passed && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            通关需要达到 {(PASS_THRESHOLD * 100).toFixed(0)}% 正确率，请继续学习后重试
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button nativeButton={false} render={<Link href="/dashboard" />} variant="outline">
            返回学习中心
          </Button>
          {!result.passed && (
            <Button
              nativeButton={false}
              render={<Link href={`/learn/${stageId}`} />}
              className="bg-[#003366] hover:bg-[#002244]"
            >
              继续学习
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 p-3">
        <div className="flex items-center gap-2 text-amber-800 text-sm">
          <AlertTriangle className="h-4 w-4" />
          考试模式：共 {questions.length} 题，需达到 90% 正确率方可通关
        </div>
        <div className="text-sm text-muted-foreground">
          已答 {answeredCount}/{questions.length}
        </div>
      </div>

      <Progress value={progressPercent} className="h-2" />

      {current && (
        <QuestionDisplay
          question={current}
          index={currentIndex}
          value={answers[current.id]}
          onChange={(v) => setAnswer(current.id, v)}
        />
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          上一题
        </Button>
        {currentIndex < questions.length - 1 ? (
          <Button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="bg-[#003366] hover:bg-[#002244]"
          >
            下一题
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#003366] hover:bg-[#002244]"
          >
            {submitting ? "提交中..." : "提交试卷"}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(i)}
            className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
              i === currentIndex
                ? "bg-[#003366] text-white"
                : answers[q.id]
                  ? "bg-blue-100 text-blue-800"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
