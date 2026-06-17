import { Suspense } from "react";
import Link from "next/link";
import { ClienteInner } from "@/app/cliente/page";
import { ObraRutas } from "@/components/ObraRutas";
import { sql } from "@/lib/db";
import type { Ruta } from "@/lib/types";

export default async function ObraDetallePage({ params }: { params: Promise<{ nombre: string }> }) {
  const { nombre } = await params;
  const obra = decodeURIComponent(nombre);
  const rutas = await sql<Ruta[]>`
    SELECT * FROM rutas
    WHERE consorcio = ${obra}
    ORDER BY consorcio, nombre
  `;

  return (
    <div className="space-y-4">
      <Link href="/obra" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        Volver a obras
      </Link>
      <ObraRutas obra={obra} initialRutas={rutas} />
      <Suspense fallback={<div className="text-sm text-zinc-500">Cargando...</div>}>
        <ClienteInner fixedConsorcio={obra} />
      </Suspense>
    </div>
  );
}
