import {
  buildSystemPrompt,
  callDeepseek,
  trimMessages,
  type ChatMessage,
} from "@/lib/ai-chat";
import { AI_MAX_INPUT_CHARS } from "@/lib/ai-config";
import {
  checkAndConsumeQuestionQuota,
  checkRateLimit,
  getQuestionQuota,
  incrementDailyStats,
} from "@/lib/ai-quota";
import { getSession } from "@/lib/session";
import type { Question } from "@/types/database";
import { NextResponse } from "next/server";

interface RequestBody {
  messages: ChatMessage[];
  question: Question;
  questionIndex: number;
  showAnswer: boolean;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get("questionId");
  if (!questionId) {
    return NextResponse.json({ error: "缺少 questionId" }, { status: 400 });
  }

  const quota = await getQuestionQuota(session.userId, questionId);
  return NextResponse.json(quota);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "未配置 DEEPSEEK_API_KEY，请在 .env.local 中添加" },
      { status: 500 }
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const { messages, question, questionIndex, showAnswer } = body;
  if (!question?.id || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage?.content?.trim()) {
    return NextResponse.json({ error: "消息内容不能为空" }, { status: 400 });
  }
  if (lastUserMessage.content.length > AI_MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `问题过长，请控制在 ${AI_MAX_INPUT_CHARS} 字以内` },
      { status: 400 }
    );
  }

  const rateOk = await checkRateLimit(session.userId);
  if (!rateOk) {
    return NextResponse.json(
      { error: "提问过于频繁，请稍后再试" },
      { status: 429 }
    );
  }

  const quota = await checkAndConsumeQuestionQuota(session.userId, question.id);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "本题 AI 提问次数已用完，请查看解析或继续下一题",
        remaining: 0,
        limit: quota.limit,
      },
      { status: 429 }
    );
  }

  const trimmed = trimMessages(messages);
  const systemPrompt = buildSystemPrompt(question, questionIndex, showAnswer);

  try {
    const content = await callDeepseek(apiKey, systemPrompt, trimmed);
    await incrementDailyStats();
    return NextResponse.json({
      content,
      remaining: quota.remaining,
      limit: quota.limit,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI 请求失败" },
      { status: 502 }
    );
  }
}
