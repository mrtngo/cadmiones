import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-sm items-center">
      <Suspense fallback={<div className="text-sm text-zinc-500">Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
