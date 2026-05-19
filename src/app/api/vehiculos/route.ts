import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Vehiculo } from "@/lib/types";

export async function GET() {
  const rows = await sql<Vehiculo[]>`
    SELECT * FROM vehiculos ORDER BY created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const placa = String(body.placa ?? "").trim().toUpperCase();
  const alias = body.alias ? String(body.alias).trim() : null;
  const precio_por_km = Number(body.precio_por_km ?? 0);

  if (!placa) return NextResponse.json({ error: "placa requerida" }, { status: 400 });

  try {
    await sql`
      INSERT INTO vehiculos (placa, alias, precio_por_km)
      VALUES (${placa}, ${alias}, ${precio_por_km})
    `;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const [row] = await sql<Vehiculo[]>`SELECT * FROM vehiculos WHERE placa = ${placa}`;
  return NextResponse.json(row, { status: 201 });
}
