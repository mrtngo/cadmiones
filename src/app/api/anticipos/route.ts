import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Anticipo } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placa = searchParams.get("placa");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const rows = await sql<Anticipo[]>`
    SELECT * FROM anticipos
    WHERE TRUE
      ${placa ? sql`AND placa = ${placa.toUpperCase()}` : sql``}
      ${desde ? sql`AND fecha >= ${desde}` : sql``}
      ${hasta ? sql`AND fecha <= ${hasta}` : sql``}
    ORDER BY fecha DESC, id DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const fecha = String(body.fecha ?? "").trim();
  const placa = String(body.placa ?? "").trim().toUpperCase();
  const monto = Number(body.monto ?? 0);
  const notas = body.notas ? String(body.notas) : null;

  if (!fecha) return NextResponse.json({ error: "fecha requerida" }, { status: 400 });
  if (!placa) return NextResponse.json({ error: "placa requerida" }, { status: 400 });
  if (!monto) return NextResponse.json({ error: "monto requerido" }, { status: 400 });

  const [row] = await sql<Anticipo[]>`
    INSERT INTO anticipos (fecha, placa, monto, notas)
    VALUES (${fecha}, ${placa}, ${monto}, ${notas})
    RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}
