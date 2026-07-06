import { LoginForm } from "@/components/auth/login-form";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const profile = await getProfile();
  if (profile) {
    redirect(profile.role === "admin" ? "/admin" : "/dashboard");
  }
  return <LoginForm />;
}
