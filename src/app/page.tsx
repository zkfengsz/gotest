import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin");
  redirect("/dashboard");
}
