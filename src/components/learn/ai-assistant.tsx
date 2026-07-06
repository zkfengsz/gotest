"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { Question } from "@/types/database";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiAssistantProps {
  question: Question;
  questionIndex: number;
  showAnswer: boolean;
}

export function AiAssistant({
  question,
  questionIndex,
  showAnswer,
}: AiAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(5);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchQuota = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai/chat?questionId=${question.id}`);
      if (res.ok) {
        const data = await res.json();
        setRemaining(data.remaining);
        setLimit(data.limit);
        setQuotaExhausted(data.remaining <= 0);
      }
    } catch {
      // ignore
    }
  }, [question.id]);

  useEffect(() => {
    setMessages([]);
    setError("");
    setQuotaExhausted(false);
    fetchQuota();
  }, [question.id, fetchQuota]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || quotaExhausted) return;

    const userMessage: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          question,
          questionIndex,
          showAnswer,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "请求失败");
        if (res.status === 429) {
          setQuotaExhausted(true);
          setRemaining(0);
        } else {
          setMessages(messages);
        }
        return;
      }

      setMessages([...nextMessages, { role: "assistant", content: data.content }]);
      if (typeof data.remaining === "number") {
        setRemaining(data.remaining);
        setLimit(data.limit ?? limit);
        setQuotaExhausted(data.remaining <= 0);
      }
    } catch {
      setError("网络错误，请稍后重试");
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const inputDisabled = loading || quotaExhausted;

  return (
    <Card className="flex h-full min-h-[520px] flex-col border shadow-md">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#003366] text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">AI 学习助手</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                针对当前题目提问，Deepseek 为你解答
              </p>
            </div>
          </div>
          {remaining !== null && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                quotaExhausted
                  ? "bg-red-50 text-red-700"
                  : "bg-blue-50 text-[#003366]"
              }`}
            >
              本题 {remaining}/{limit} 次
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-3 min-h-0">
        <ScrollArea className="flex-1 min-h-0 pr-3">
          <div className="space-y-3">
            {messages.length === 0 && !quotaExhausted && (
              <div className="rounded-lg bg-slate-50 p-4 text-sm text-muted-foreground">
                <p className="flex items-center gap-2 font-medium text-foreground mb-2">
                  <Bot className="h-4 w-4" />
                  你可以问我：
                </p>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li>这道题考查的知识点是什么？</li>
                  <li>请用通俗的例子解释一下</li>
                  <li>我在工作中怎么用到这个概念？</li>
                </ul>
              </div>
            )}

            {quotaExhausted && messages.length === 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                本题 AI 提问次数已用完。请点击「查看解析」或进入下一题继续学习。
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[#003366] text-white"
                      : "bg-slate-100 text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                思考中...
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {error && (
          <p className="text-xs text-destructive bg-red-50 rounded px-2 py-1.5">
            {error}
          </p>
        )}

        <div className="flex gap-2 shrink-0">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              quotaExhausted
                ? "本题提问次数已用完"
                : "输入你的问题（最多 300 字）..."
            }
            rows={2}
            maxLength={300}
            className="resize-none text-sm"
            disabled={inputDisabled}
          />
          <Button
            onClick={handleSend}
            disabled={inputDisabled || !input.trim()}
            className="h-auto bg-[#003366] hover:bg-[#002244] px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
