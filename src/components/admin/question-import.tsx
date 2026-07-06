"use client";

import { importQuestions } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function QuestionImportDialog() {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"json" | "markdown">("json");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    setLoading(true);
    const result = await importQuestions(content, format);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`成功导入 ${result.count} 道题目`);
      setOpen(false);
      setContent("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            导入题库
          </Button>
        }
      />
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>导入题库</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>格式</Label>
            <Select value={format} onValueChange={(v) => v && setFormat(v as "json" | "markdown")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>内容</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              className="font-mono text-xs"
              placeholder={
                format === "json"
                  ? '[{"stage_id":1,"type":"single","content":"...","options":[{"id":"A","text":"..."}],"correct_answer":"A"}]'
                  : "stage: 1\ntype: single\n## 题目内容\n### 选项\n- [A] 选项A\nanswer: A\n---"
              }
            />
          </div>

          <Button
            onClick={handleImport}
            disabled={loading || !content.trim()}
            className="w-full bg-[#003366] hover:bg-[#002244]"
          >
            {loading ? "导入中..." : "开始导入"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
