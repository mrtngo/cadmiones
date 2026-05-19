import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Registro } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placa = searchParams.get("placa");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const rows = await sql<Registro[]>`
    SELECT * FROM registros
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
  const km_recorridos = Number(body.km_recorridos ?? 0);
  const gasto_gasolina = Number(body.gasto_gasolina ?? 0);
  const precio_gasolina = body.precio_gasolina === "" || body.precio_gasolina == null
    ? null
    : Number(body.precio_gasolina);
  const notas = body.notas ? String(body.notas) : null;

  if (!fecha) return NextResponse.json({ error: "fecha requerida" }, { status: 400 });
  if (!placa) return NextResponse.json({ error: "placa requerida" }, { status: 400 });

  const [row] = await sql<Registro[]>`
    INSERT INTO registros (fecha, placa, km_recorridos, gasto_gasolina, precio_gasolina, notas)
    VALUES (${fecha}, ${placa}, ${km_recorridos}, ${gasto_gasolina}, ${precio_gasolina}, ${notas})
    RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}
