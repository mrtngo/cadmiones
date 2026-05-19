import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Vehiculo } from "@/lib/types";

export async function GET() {
  const rows = await sql<Vehiculo[]>`
    SELECT * FROM vehiculos ORDER BY created_at DESC
  `;
  return NextResponse.json(rows);
}

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function numOrNull(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  const body = await req.json();
  const placa = String(body.placa ?? "").trim().toUpperCase();
  const alias = trimOrNull(body.alias);
  const conductor = trimOrNull(body.conductor);
  const propietario = trimOrNull(body.propietario);
  const volumen_m3 = numOrNull(body.volumen_m3);
  const consorcio_actual = trimOrNull(body.consorcio_actual);
  const precio_por_km = Number(body.precio_por_km ?? 0);

  if (!placa) return NextResponse.json({ error: "placa requerida" }, { status: 400 });

  try {
    await sql`
      INSERT INTO vehiculos (placa, alias, conductor, propietario, volumen_m3, consorcio_actual, precio_por_km)
      VALUES (${placa}, ${alias}, ${conductor}, ${propietario}, ${volumen_m3}, ${consorcio_actual}, ${precio_por_km})
    `;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const [row] = await sql<Vehiculo[]>`SELECT * FROM vehiculos WHERE placa = ${placa}`;
  return NextResponse.json(row, { status: 201 });
}
