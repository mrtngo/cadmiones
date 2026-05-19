import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Vehiculo } from "@/lib/types";

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ placa: string }> }
) {
  const { placa: raw } = await params;
  const placa = decodeURIComponent(raw).toUpperCase();
  const body = await req.json();

  const updates: Record<string, string | number | null> = {};
  if (body.alias !== undefined) updates.alias = trimOrNull(body.alias);
  if (body.conductor !== undefined) updates.conductor = trimOrNull(body.conductor);
  if (body.propietario !== undefined) updates.propietario = trimOrNull(body.propietario);
  if (body.precio_por_km !== undefined) updates.precio_por_km = Number(body.precio_por_km);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });
  }

  await sql`UPDATE vehiculos SET ${sql(updates)} WHERE placa = ${placa}`;
  const [row] = await sql<Vehiculo[]>`SELECT * FROM vehiculos WHERE placa = ${placa}`;
  if (!row) return NextResponse.json({ error: "no existe" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ placa: string }> }
) {
  const { placa: raw } = await params;
  const placa = decodeURIComponent(raw).toUpperCase();
  await sql`DELETE FROM vehiculos WHERE placa = ${placa}`;
  return NextResponse.json({ ok: true });
}
