"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Label, btnCls, inputCls } from "@/components/ui";
import { TruckLogo } from "@/components/TruckLogo";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [user, setUser] = useState("");
  const [clave, setClave] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, clave }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErr(body.error ?? "No se pudo iniciar sesion");
      return;
    }

    const next = search.get("next") || "/";
    router.push(next.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <Card className="w-full">
      <div className="mb-5 flex items-center gap-2">
        <TruckLogo />
        <div>
          <h1 className="text-xl font-bold tracking-tight">Cadmiones</h1>
          <p className="text-sm text-zinc-500">Iniciar sesion</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>Usuario</Label>
          <input
            className={inputCls}
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </div>
        <div>
          <Label>Clave</Label>
          <input
            className={inputCls}
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {err ? <div className="text-sm text-red-600">{err}</div> : null}
        <button type="submit" className={`${btnCls} w-full`} disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </Card>
  );
}
