"use client";

import { cn } from "@/lib/utils";
import type { QuestionOption } from "@/types/database";
import { Check } from "lucide-react";

interface MultipleChoiceProps {
  options: QuestionOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  showCorrect?: boolean;
  correctAnswer?: string[];
  disabled?: boolean;
}

export function MultipleChoice({
  options,
  value = [],
  onChange,
  showCorrect,
  correctAnswer = [],
  disabled,
}: MultipleChoiceProps) {
  function toggle(id: string) {
    if (disabled) return;
    const next = value.includes(id)
      ? value.filter((v) => v !== id)
      : [...value, id];
    onChange?.(next);
  }

  return (
    <div className="space-y-2">
      <p className="mb-3 text-xs text-muted-foreground">（多选题，可选择多个答案）</p>
      {options.map((opt) => {
        const isSelected = value.includes(opt.id);
        const isCorrect = showCorrect && correctAnswer.includes(opt.id);
        const isWrong =
          showCorrect && isSelected && !correctAnswer.includes(opt.id);

        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt.id)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-all",
              isSelected && !showCorrect && "border-[#003366] bg-blue-50",
              isCorrect && "border-green-500 bg-green-50",
              isWrong && "border-red-500 bg-red-50",
              !disabled && "hover:border-[#003366]/50 hover:bg-slate-50",
              disabled && "cursor-default"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs font-semibold",
                isSelected && !showCorrect && "border-[#003366] bg-[#003366] text-white",
                isCorrect && "border-green-600 bg-green-600 text-white",
                isWrong && "border-red-600 bg-red-600 text-white"
              )}
            >
              {isSelected || isCorrect ? <Check className="h-3.5 w-3.5" /> : opt.id}
            </span>
            <span className="text-sm leading-relaxed">{opt.text}</span>
          </button>
        );
      })}
    </div>
  );
}
