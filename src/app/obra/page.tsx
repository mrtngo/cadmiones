"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, H2, Label, btnCls, inputCls } from "@/components/ui";
import type { Obra } from "@/lib/types";

export default function ObraPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [nombre, setNombre] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function loadObras() {
    const rows: Obra[] = await fetch("/api/obras").then((r) => r.json());
    setObras(rows);
  }

  useEffect(() => {
    fetch("/api/obras")
      .then((r) => r.json())
      .then((rows: Obra[]) => setObras(rows));
  }, []);

  async function addObra(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const clean = nombre.trim();
    if (!clean) return;

    const res = await fetch("/api/obras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: clean }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErr(body.error ?? "No se pudo crear la obra");
      return;
    }
    setNombre("");
    loadObras();
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Obras</h1>
        <p className="text-sm text-zinc-500 mt-1">Creá una obra y abrila para ver viajes, anticipos y por cobrar.</p>
      </section>

      <Card>
        <H2>Crear obra</H2>
        <form onSubmit={addObra} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label>Nombre</Label>
            <input
              className={inputCls}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Obra Norte"
              required
            />
          </div>
          <button className={btnCls} type="submit">Crear obra</button>
        </form>
        {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
      </Card>

      <section>
        <H2>Obras creadas</H2>
        {obras.length === 0 ? (
          <p className="text-sm text-zinc-500">Aún no hay obras.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {obras.map((obra) => (
              <Link
                key={obra.nombre}
                href={`/obra/${encodeURIComponent(obra.nombre)}`}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-500"
              >
                <h2 className="font-semibold tracking-tight">{obra.nombre}</h2>
                <p className="mt-1 text-xs text-zinc-500">Abrir detalle</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
