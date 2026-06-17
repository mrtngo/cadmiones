import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Obra } from "@/lib/types";

export async function GET() {
  const rows = await sql<Obra[]>`
    WITH names AS (
      SELECT nombre, created_at FROM obras
      UNION
      SELECT consorcio_actual AS nombre, MIN(created_at) AS created_at
      FROM vehiculos
      WHERE consorcio_actual IS NOT NULL AND BTRIM(consorcio_actual) <> ''
      GROUP BY consorcio_actual
      UNION
      SELECT consorcio AS nombre, MIN(created_at) AS created_at
      FROM registros
      WHERE consorcio IS NOT NULL AND BTRIM(consorcio) <> ''
      GROUP BY consorcio
      UNION
      SELECT consorcio AS nombre, MIN(created_at) AS created_at
      FROM anticipos
      WHERE consorcio IS NOT NULL AND BTRIM(consorcio) <> ''
      GROUP BY consorcio
    )
    SELECT nombre, MIN(created_at) AS created_at
    FROM names
    GROUP BY nombre
    ORDER BY nombre
  `;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const nombre = String(body.nombre ?? "").trim();

  if (!nombre) return NextResponse.json({ error: "nombre requerido" }, { status: 400 });

  try {
    const [row] = await sql<Obra[]>`
      INSERT INTO obras (nombre)
      VALUES (${nombre})
      ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
