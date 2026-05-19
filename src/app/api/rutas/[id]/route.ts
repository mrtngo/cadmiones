import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Ruta } from "@/lib/types";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, string | number> = {};
  if (body.nombre !== undefined) updates.nombre = String(body.nombre).trim();
  if (body.consorcio !== undefined) updates.consorcio = String(body.consorcio).trim();
  if (body.precio_facturado_m3km !== undefined) updates.precio_facturado_m3km = Number(body.precio_facturado_m3km);
  if (body.precio_cobrado_m3km !== undefined) updates.precio_cobrado_m3km = Number(body.precio_cobrado_m3km);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });
  }
  await sql`UPDATE rutas SET ${sql(updates)} WHERE id = ${Number(id)}`;
  const [row] = await sql<Ruta[]>`SELECT * FROM rutas WHERE id = ${Number(id)}`;
  if (!row) return NextResponse.json({ error: "no existe" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await sql`DELETE FROM rutas WHERE id = ${Number(id)}`;
  return NextResponse.json({ ok: true });
}
