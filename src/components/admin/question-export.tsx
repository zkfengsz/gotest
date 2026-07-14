"use client";

import { getQuestions } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { questionsToJson, questionsToMarkdown } from "@/lib/questions-export";
import { Download, FileJson, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function QuestionExportButtons() {
  const [loading, setLoading] = useState<"json" | "markdown" | null>(null);

  async function handleExport(format: "json" | "markdown") {
    setLoading(format);
    try {
      const questions = await getQuestions();
      if (questions.length === 0) {
        toast.error("当前没有可导出的题目");
        return;
      }

      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "json") {
        downloadTextFile(
          `questions-${stamp}.json`,
          questionsToJson(questions),
          "application/json"
        );
      } else {
        downloadTextFile(
          `questions-${stamp}.md`,
          questionsToMarkdown(questions),
          "text/markdown"
        );
      }
      toast.success(`已导出 ${questions.length} 道题目`);
    } catch {
      toast.error("导出失败，请稍后重试");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="gap-2"
        disabled={loading !== null}
        onClick={() => handleExport("json")}
      >
        {loading === "json" ? (
          <Download className="h-4 w-4 animate-pulse" />
        ) : (
          <FileJson className="h-4 w-4" />
        )}
        导出 JSON
      </Button>
      <Button
        variant="outline"
        className="gap-2"
        disabled={loading !== null}
        onClick={() => handleExport("markdown")}
      >
        {loading === "markdown" ? (
          <Download className="h-4 w-4 animate-pulse" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        导出 Markdown
      </Button>
    </>
  );
}
