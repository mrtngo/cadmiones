import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Combustible } from "@/lib/types";

function numOrNull(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, string | number | null> = {};
  if (body.fecha !== undefined) updates.fecha = String(body.fecha).trim();
  if (body.monto !== undefined) updates.monto = Number(body.monto);
  if (body.galones !== undefined) updates.galones = numOrNull(body.galones);
  if (body.precio_galon !== undefined) updates.precio_galon = numOrNull(body.precio_galon);
  if (body.notas !== undefined) updates.notas = body.notas ? String(body.notas) : null;
  if (body.image_url !== undefined) updates.image_url = body.image_url ? String(body.image_url) : null;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });
  }
  await sql`UPDATE combustibles SET ${sql(updates)} WHERE id = ${Number(id)}`;
  const [row] = await sql<Combustible[]>`SELECT * FROM combustibles WHERE id = ${Number(id)}`;
  if (!row) return NextResponse.json({ error: "no existe" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await sql`DELETE FROM combustibles WHERE id = ${Number(id)}`;
  return NextResponse.json({ ok: true });
}
