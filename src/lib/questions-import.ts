import type { DragOptions, QuestionOption } from "@/types/database";

export interface ImportQuestion {
  stage_id: number;
  type: "single" | "multiple" | "drag";
  content: string;
  options: QuestionOption[] | DragOptions;
  correct_answer: string | string[] | { left: string; right: string }[];
  explanation?: string;
  order_index?: number;
}

export function parseQuestionsJson(raw: string): ImportQuestion[] {
  const data = JSON.parse(raw);
  const items = Array.isArray(data) ? data : data.questions;
  if (!Array.isArray(items)) {
    throw new Error("JSON 格式无效：需要题目数组或 { questions: [] }");
  }
  return items.map(validateImportQuestion);
}

export function parseQuestionsMarkdown(raw: string): ImportQuestion[] {
  const blocks = raw.split(/\n---+\n/).map((b) => b.trim()).filter(Boolean);
  const questions: ImportQuestion[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    const meta: Record<string, string> = {};
    let content = "";
    let options: QuestionOption[] = [];
    let leftOptions: QuestionOption[] = [];
    let rightOptions: QuestionOption[] = [];
    let correct: string | string[] | { left: string; right: string }[] = [];
    let explanation = "";
    let inContent = false;
    let inExplanation = false;
    let inLeft = false;
    let inRight = false;

    for (const line of lines) {
      if (line.startsWith("stage:")) meta.stage = line.replace("stage:", "").trim();
      else if (line.startsWith("type:")) meta.type = line.replace("type:", "").trim();
      else if (line.startsWith("order:")) meta.order = line.replace("order:", "").trim();
      else if (line.startsWith("## ")) {
        inContent = true;
        inLeft = false;
        inRight = false;
        content = line.replace("## ", "").trim();
      } else if (line.startsWith("### 选项")) {
        inContent = false;
        inLeft = false;
        inRight = false;
      } else if (line.startsWith("### 左侧")) {
        inContent = false;
        inLeft = true;
        inRight = false;
      } else if (line.startsWith("### 右侧")) {
        inContent = false;
        inLeft = false;
        inRight = true;
      } else if (line.startsWith("### 解析")) {
        inExplanation = true;
        inLeft = false;
        inRight = false;
      } else if (line.startsWith("answer:")) {
        const ans = line.replace("answer:", "").trim();
        if (meta.type === "drag") {
          correct = ans.split(",").map((pair) => {
            const [left, right] = pair.split(":").map((s) => s.trim());
            return { left, right };
          });
        } else {
          correct = ans.includes(",") ? ans.split(",").map((s) => s.trim()) : ans;
        }
      } else if (line.match(/^- \[[^\]]+\]/)) {
        const match = line.match(/^- \[([^\]]+)\] (.+)/);
        if (match) {
          const item = { id: match[1], text: match[2] };
          if (inLeft) leftOptions.push(item);
          else if (inRight) rightOptions.push(item);
          else options.push(item);
        }
      } else if (inExplanation) {
        explanation += (explanation ? "\n" : "") + line;
      } else if (inContent && line.trim()) {
        content += "\n" + line;
      }
    }

    if (!meta.stage || !meta.type || !content) continue;

    const parsedOptions =
      meta.type === "drag"
        ? { left: leftOptions, right: rightOptions }
        : options;

    questions.push(
      validateImportQuestion({
        stage_id: Number(meta.stage),
        type: meta.type as ImportQuestion["type"],
        content: content.trim(),
        options: parsedOptions,
        correct_answer: correct,
        explanation: explanation.trim() || undefined,
        order_index: meta.order ? Number(meta.order) : questions.length,
      })
    );
  }

  return questions;
}

function validateImportQuestion(q: ImportQuestion): ImportQuestion {
  if (!q.stage_id || q.stage_id < 1 || q.stage_id > 3) {
    throw new Error(`无效 stage_id: ${q.stage_id}`);
  }
  if (!["single", "multiple", "drag"].includes(q.type)) {
    throw new Error(`无效题型: ${q.type}`);
  }
  if (!q.content?.trim()) {
    throw new Error("题目内容不能为空");
  }
  return q;
}
