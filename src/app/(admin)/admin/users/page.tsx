import { getAllUsers } from "@/app/actions/admin";
import { UserTable } from "@/components/admin/user-table";

export default async function AdminUsersPage() {
  const { profiles, progress, exams } = await getAllUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#003366]">用户管理</h1>
        <p className="text-muted-foreground mt-1">
          查看学习进度与考试成绩，管理用户角色
        </p>
      </div>
      <UserTable profiles={profiles} progress={progress} exams={exams} />
    </div>
  );
}
