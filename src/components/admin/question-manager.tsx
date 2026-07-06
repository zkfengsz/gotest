"use client";

import { deleteQuestion, upsertQuestion } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DragOptions, Question, QuestionOption } from "@/types/database";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface QuestionFormDialogProps {
  question?: Question;
  onSuccess?: () => void;
}

export function QuestionFormDialog({ question, onSuccess }: QuestionFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stageId, setStageId] = useState(String(question?.stage_id ?? 1));
  const [type, setType] = useState<Question["type"]>(question?.type ?? "single");
  const [content, setContent] = useState(question?.content ?? "");
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [orderIndex, setOrderIndex] = useState(String(question?.order_index ?? 0));
  const [optionsJson, setOptionsJson] = useState(
    JSON.stringify(question?.options ?? [{ id: "A", text: "" }, { id: "B", text: "" }], null, 2)
  );
  const [answerJson, setAnswerJson] = useState(
    JSON.stringify(question?.correct_answer ?? "A", null, 2)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const options = JSON.parse(optionsJson) as QuestionOption[] | DragOptions;
      const correct_answer = JSON.parse(answerJson);

      const result = await upsertQuestion({
        id: question?.id,
        stage_id: Number(stageId),
        type,
        content,
        options,
        correct_answer,
        explanation,
        order_index: Number(orderIndex),
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(question ? "题目已更新" : "题目已创建");
        setOpen(false);
        onSuccess?.();
      }
    } catch {
      toast.error("JSON 格式错误，请检查选项和答案");
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={question ? "ghost" : "default"}
            size={question ? "icon" : "default"}
            className={question ? "" : "bg-[#003366] hover:bg-[#002244]"}
          >
            {question ? <Pencil className="h-4 w-4" /> : <><Plus className="h-4 w-4 mr-1" /> 新增题目</>}
          </Button>
        }
      />
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? "编辑题目" : "新增题目"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>阶段</Label>
              <Select value={stageId} onValueChange={(v) => v && setStageId(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Stage 1</SelectItem>
                  <SelectItem value="2">Stage 2</SelectItem>
                  <SelectItem value="3">Stage 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>题型</Label>
              <Select value={type} onValueChange={(v) => v && setType(v as Question["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">单选题</SelectItem>
                  <SelectItem value="multiple">多选题</SelectItem>
                  <SelectItem value="drag">拖拽匹配</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>排序</Label>
              <Input value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} type="number" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>题目内容</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} required />
          </div>

          <div className="space-y-2">
            <Label>选项 (JSON)</Label>
            <Textarea value={optionsJson} onChange={(e) => setOptionsJson(e.target.value)} rows={6} className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">
              单选/多选: [{`{"id":"A","text":"..."}`}, ...] · 拖拽: {`{"left":[...],"right":[...]}`}
            </p>
          </div>

          <div className="space-y-2">
            <Label>正确答案 (JSON)</Label>
            <Textarea value={answerJson} onChange={(e) => setAnswerJson(e.target.value)} rows={3} className="font-mono text-xs" />
          </div>

          <div className="space-y-2">
            <Label>解析</Label>
            <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-[#003366] hover:bg-[#002244]">
            {loading ? "保存中..." : "保存"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface QuestionTableProps {
  questions: Question[];
}

export function QuestionTable({ questions }: QuestionTableProps) {
  async function handleDelete(id: string) {
    if (!confirm("确定删除此题目？")) return;
    const result = await deleteQuestion(id);
    if (result.error) toast.error(result.error);
    else toast.success("已删除");
  }

  const typeLabels = { single: "单选", multiple: "多选", drag: "拖拽" };

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">阶段</th>
            <th className="px-4 py-3 text-left font-medium">题型</th>
            <th className="px-4 py-3 text-left font-medium">题目</th>
            <th className="px-4 py-3 text-left font-medium">排序</th>
            <th className="px-4 py-3 text-right font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {questions.map((q) => (
            <tr key={q.id} className="hover:bg-slate-50/50">
              <td className="px-4 py-3">Stage {q.stage_id}</td>
              <td className="px-4 py-3">
                <Badge variant="secondary">{typeLabels[q.type]}</Badge>
              </td>
              <td className="px-4 py-3 max-w-md truncate">{q.content}</td>
              <td className="px-4 py-3">{q.order_index}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <QuestionFormDialog question={q} />
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {questions.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">暂无题目</p>
      )}
    </div>
  );
}
