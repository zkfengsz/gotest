"use client";

import { markQuestionViewed } from "@/app/actions/learning";
import { AiAssistant } from "@/components/learn/ai-assistant";
import { QuestionDisplay } from "@/components/questions/question-display";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { LearningProgress, Question } from "@/types/database";
import { BookOpen, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface LearnClientProps {
  stageId: number;
  questions: Question[];
  progress: LearningProgress | null;
  canTakeExam: boolean;
}

export function LearnClient({
  stageId,
  questions,
  progress,
  canTakeExam,
}: LearnClientProps) {
  const viewed = new Set(progress?.viewed_question_ids ?? []);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const firstUnviewed = questions.findIndex((q) => !viewed.has(q.id));
    return firstUnviewed >= 0 ? firstUnviewed : 0;
  });
  const [showAnswer, setShowAnswer] = useState(false);
  const [practiceAnswers, setPracticeAnswers] = useState<
    Record<string, string | string[] | { left: string; right: string }[]>
  >({});

  const current = questions[currentIndex];
  const viewedCount = questions.filter((q) => viewed.has(q.id)).length;
  const progressPercent =
    questions.length > 0 ? (viewedCount / questions.length) * 100 : 0;
  const learningCompleted = progress?.learning_completed ?? false;

  async function goTo(index: number) {
    if (index < 0 || index >= questions.length) return;
    const q = questions[index];
    await markQuestionViewed(stageId, q.id);
    setCurrentIndex(index);
    setShowAnswer(false);
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-20">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">该阶段暂无题目，请联系管理员导入题库</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            学习进度 {viewedCount}/{questions.length} · 第 {currentIndex + 1} 题
          </p>
          <Progress value={progressPercent} className="mt-2 h-2 w-48" />
        </div>
        {canTakeExam && learningCompleted && (
          <Button
            nativeButton={false}
            render={<Link href={`/learn/${stageId}/exam`} />}
            className="bg-[#003366] hover:bg-[#002244] gap-2"
          >
            <GraduationCap className="h-4 w-4" />
            进入考试
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
        <div className="space-y-6 min-w-0">
          {current && (
            <QuestionDisplay
              question={current}
              index={currentIndex}
              value={practiceAnswers[current.id]}
              onChange={(v) =>
                setPracticeAnswers((prev) => ({ ...prev, [current.id]: v }))
              }
              showAnswer={showAnswer}
            />
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              上一题
            </Button>

            <Button
              variant={showAnswer ? "secondary" : "default"}
              onClick={() => setShowAnswer(!showAnswer)}
              className={!showAnswer ? "bg-[#003366] hover:bg-[#002244]" : ""}
            >
              {showAnswer ? "隐藏解析" : "查看解析"}
            </Button>

            <Button
              variant="outline"
              onClick={() => goTo(currentIndex + 1)}
              disabled={currentIndex === questions.length - 1}
            >
              下一题
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {current && (
          <div className="lg:sticky lg:top-20 lg:self-start h-[calc(100vh-8rem)] max-h-[720px]">
            <AiAssistant
              question={current}
              questionIndex={currentIndex}
              showAnswer={showAnswer}
            />
          </div>
        )}
      </div>
    </div>
  );
}
