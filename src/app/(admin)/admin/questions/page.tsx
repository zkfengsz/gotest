import { getQuestions } from "@/app/actions/admin";
import { QuestionExportButtons } from "@/components/admin/question-export";
import { QuestionFormDialog, QuestionTable } from "@/components/admin/question-manager";
import { QuestionImportDialog } from "@/components/admin/question-import";

export default async function AdminQuestionsPage() {
  const questions = await getQuestions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">题库管理</h1>
          <p className="text-muted-foreground mt-1">
            增删改查题目，支持 JSON / Markdown 批量导入与导出
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <QuestionExportButtons />
          <QuestionImportDialog />
          <QuestionFormDialog />
        </div>
      </div>

      <QuestionTable questions={questions} />
    </div>
  );
}
