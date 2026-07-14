import type { DragOptions, Question, QuestionOption } from "@/types/database";

function isDragOptions(options: Question["options"]): options is DragOptions {
  return Boolean(options && typeof options === "object" && "left" in options && "right" in options);
}

function formatAnswer(question: Question): string {
  const answer = question.correct_answer;
  if (question.type === "drag" && Array.isArray(answer)) {
    return (answer as { left: string; right: string }[])
      .map((pair) => `${pair.left}:${pair.right}`)
      .join(",");
  }
  if (Array.isArray(answer)) {
    return answer.join(",");
  }
  return String(answer ?? "");
}

function formatOptionLines(options: QuestionOption[]): string {
  return options.map((opt) => `- [${opt.id}] ${opt.text}`).join("\n");
}

export function questionsToJson(questions: Question[]): string {
  const payload = questions.map((q) => ({
    stage_id: q.stage_id,
    type: q.type,
    content: q.content,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation || undefined,
    order_index: q.order_index,
  }));
  return JSON.stringify(payload, null, 2);
}

export function questionsToMarkdown(questions: Question[]): string {
  const sorted = [...questions].sort((a, b) => {
    if (a.stage_id !== b.stage_id) return a.stage_id - b.stage_id;
    return a.order_index - b.order_index;
  });

  return sorted
    .map((q) => {
      const lines: string[] = [
        `stage: ${q.stage_id}`,
        `type: ${q.type}`,
        `order: ${q.order_index}`,
        `## ${q.content}`,
      ];

      if (q.type === "drag" && isDragOptions(q.options)) {
        lines.push("### 左侧");
        lines.push(formatOptionLines(q.options.left));
        lines.push("### 右侧");
        lines.push(formatOptionLines(q.options.right));
      } else {
        lines.push("### 选项");
        lines.push(formatOptionLines(q.options as QuestionOption[]));
      }

      lines.push(`answer: ${formatAnswer(q)}`);
      if (q.explanation?.trim()) {
        lines.push("### 解析");
        lines.push(q.explanation.trim());
      }

      return lines.join("\n");
    })
    .join("\n---\n");
}
