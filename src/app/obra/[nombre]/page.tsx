"use client";
import { Suspense, use } from "react";
import Link from "next/link";
import { ClienteInner } from "@/app/cliente/page";

export default function ObraDetallePage({ params }: { params: Promise<{ nombre: string }> }) {
  const { nombre } = use(params);
  const obra = decodeURIComponent(nombre);

  return (
    <div className="space-y-4">
      <Link href="/obra" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        Volver a obras
      </Link>
      <Suspense fallback={<div className="text-sm text-zinc-500">Cargando...</div>}>
        <ClienteInner fixedConsorcio={obra} />
      </Suspense>
    </div>
  );
}
