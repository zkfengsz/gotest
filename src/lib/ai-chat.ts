import {
  AI_MAX_HISTORY_TURNS,
  AI_MAX_OUTPUT_TOKENS,
} from "@/lib/ai-config";
import { formatQuestionForAI } from "@/lib/question-context";
import type { Question } from "@/types/database";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function trimMessages(
  messages: ChatMessage[],
  maxTurns = AI_MAX_HISTORY_TURNS
): ChatMessage[] {
  const maxMessages = maxTurns * 2;
  if (messages.length <= maxMessages) return messages;
  return messages.slice(-maxMessages);
}

export function buildSystemPrompt(
  question: Question,
  questionIndex: number,
  showAnswer: boolean
): string {
  const questionContext = formatQuestionForAI(question, questionIndex, showAnswer);

  return `你是 D&B AI 学习平台的智能学习助手，帮助销售、市场及中后台员工理解 AI 基础知识。

用户正在学习以下题目，请基于题目内容回答用户的问题：
- 用简洁、易懂的中文解释概念，回答控制在 200 字以内
- 可以举例说明，结合企业办公场景
- 如果用户问的是题目相关，引导其理解而非直接泄题（除非用户已查看解析）
- 不要编造题目中没有的信息

当前题目：
${questionContext}`;
}

export async function callDeepseek(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: AI_MAX_OUTPUT_TOKENS,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Deepseek API 错误: ${response.status} ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI 未返回有效内容");
  }
  return content;
}
