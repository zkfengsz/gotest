"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DragOptions, Question, UserAnswer } from "@/types/database";
import { DragMatch } from "./drag-match";
import { MultipleChoice } from "./multiple-choice";
import { SingleChoice } from "./single-choice";

interface QuestionDisplayProps {
  question: Question;
  index: number;
  value?: UserAnswer;
  onChange?: (value: UserAnswer) => void;
  showAnswer?: boolean;
  disabled?: boolean;
}

const typeLabels = {
  single: "单选题",
  multiple: "多选题",
  drag: "拖拽匹配题",
};

export function QuestionDisplay({
  question,
  index,
  value,
  onChange,
  showAnswer,
  disabled,
}: QuestionDisplayProps) {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{typeLabels[question.type]}</Badge>
          <span className="text-sm text-muted-foreground">第 {index + 1} 题</span>
        </div>
        <CardTitle className="text-base font-medium leading-relaxed">
          {question.content}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {question.type === "single" && (
          <SingleChoice
            options={question.options as { id: string; text: string }[]}
            value={value as string | undefined}
            onChange={onChange as (v: string) => void}
            showCorrect={showAnswer}
            correctAnswer={question.correct_answer as string}
            disabled={disabled}
          />
        )}
        {question.type === "multiple" && (
          <MultipleChoice
            options={question.options as { id: string; text: string }[]}
            value={(value as string[]) ?? []}
            onChange={onChange as (v: string[]) => void}
            showCorrect={showAnswer}
            correctAnswer={question.correct_answer as string[]}
            disabled={disabled}
          />
        )}
        {question.type === "drag" && (
          <DragMatch
            options={question.options as DragOptions}
            value={(value as { left: string; right: string }[]) ?? []}
            onChange={onChange as (v: { left: string; right: string }[]) => void}
            showCorrect={showAnswer}
            correctAnswer={
              question.correct_answer as { left: string; right: string }[]
            }
            disabled={disabled}
          />
        )}

        {showAnswer && question.explanation && (
          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-medium text-amber-900 mb-1">解析</p>
            <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">
              {question.explanation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
