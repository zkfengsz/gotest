import { LoginForm } from "@/components/auth/login-form";
import { getProfile, redirectIfStaleSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  await redirectIfStaleSession();
  const profile = await getProfile();
  if (profile) {
    redirect(profile.role === "admin" ? "/admin" : "/dashboard");
  }
  return <LoginForm />;
}
