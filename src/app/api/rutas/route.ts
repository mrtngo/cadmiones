import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Ruta } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const consorcio = searchParams.get("consorcio");

  const rows = await sql<Ruta[]>`
    SELECT * FROM rutas
    WHERE TRUE
      ${consorcio ? sql`AND consorcio = ${consorcio}` : sql``}
    ORDER BY consorcio, nombre
  `;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const consorcio = String(body.consorcio ?? "").trim();
  const nombre = String(body.nombre ?? "").trim();
  const precio_facturado_m3km = Number(body.precio_facturado_m3km ?? 0);
  const precio_cobrado_m3km = Number(body.precio_cobrado_m3km ?? 0);

  if (!consorcio) return NextResponse.json({ error: "consorcio requerido" }, { status: 400 });
  if (!nombre) return NextResponse.json({ error: "nombre requerido" }, { status: 400 });

  try {
    const [row] = await sql<Ruta[]>`
      INSERT INTO rutas (consorcio, nombre, precio_facturado_m3km, precio_cobrado_m3km)
      VALUES (${consorcio}, ${nombre}, ${precio_facturado_m3km}, ${precio_cobrado_m3km})
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
