import { Suspense } from "react";
import { LoginForm } from "@/src/components/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFF8EE]" />}>
      <LoginForm />
    </Suspense>
  );
}
