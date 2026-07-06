import type { DragOptions, Question, QuestionOption } from "@/types/database";

const typeLabels = {
  single: "单选题",
  multiple: "多选题",
  drag: "拖拽匹配题",
};

export function formatQuestionForAI(
  question: Question,
  index: number,
  showAnswer: boolean
): string {
  let text = `【第 ${index + 1} 题 · ${typeLabels[question.type]}】\n${question.content}\n\n`;

  if (question.type === "single" || question.type === "multiple") {
    const opts = question.options as QuestionOption[];
    text += "选项：\n" + opts.map((o) => `${o.id}. ${o.text}`).join("\n");
  } else {
    const opts = question.options as DragOptions;
    text +=
      "左侧匹配项：\n" +
      opts.left.map((o) => `${o.id}. ${o.text}`).join("\n");
    text +=
      "\n\n右侧可选项：\n" +
      opts.right.map((o) => `${o.id}. ${o.text}`).join("\n");
  }

  if (showAnswer) {
    text += `\n\n正确答案：${JSON.stringify(question.correct_answer)}`;
    if (question.explanation) {
      text += `\n官方解析：${question.explanation}`;
    }
  }

  return text;
}
