import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Registro, Ruta } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placa = searchParams.get("placa");
  const consorcio = searchParams.get("consorcio");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const rows = await sql<Registro[]>`
    SELECT * FROM registros
    WHERE TRUE
      ${placa ? sql`AND placa = ${placa.toUpperCase()}` : sql``}
      ${consorcio ? sql`AND consorcio = ${consorcio}` : sql``}
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
  const image_url = body.image_url ? String(body.image_url) : null;

  if (!fecha) return NextResponse.json({ error: "fecha requerida" }, { status: 400 });
  if (!placa) return NextResponse.json({ error: "placa requerida" }, { status: 400 });

  // Si viene ruta_id, precios + m3 + consorcio se snapshotean desde la ruta
  // (m3 de la ruta si existe, si no del vehículo). Si no, modo legacy.
  let ruta_id: number | null = body.ruta_id ? Number(body.ruta_id) : null;
  let ruta_nombre: string | null = null;
  let consorcio: string | null = body.consorcio ? String(body.consorcio).trim() || null : null;
  let precio_facturado_m3km: number | null = null;
  let precio_cobrado_m3km: number | null = null;
  let m3: number | null = null;

  if (ruta_id) {
    const [r] = await sql<Ruta[]>`SELECT * FROM rutas WHERE id = ${ruta_id}`;
    if (!r) return NextResponse.json({ error: "ruta no existe" }, { status: 400 });
    ruta_nombre = r.nombre;
    consorcio = r.consorcio;
    precio_facturado_m3km = r.precio_facturado_m3km;
    precio_cobrado_m3km = r.precio_cobrado_m3km;
    if (r.m3 != null) {
      m3 = r.m3;
    } else {
      const [v] = await sql<{ volumen_m3: number | null }[]>`
        SELECT volumen_m3 FROM vehiculos WHERE placa = ${placa}
      `;
      m3 = v?.volumen_m3 ?? null;
    }
  } else {
    ruta_id = null;
  }

  const [row] = await sql<Registro[]>`
    INSERT INTO registros (
      fecha, placa, consorcio, ruta_id, ruta_nombre, m3,
      precio_facturado_m3km, precio_cobrado_m3km,
      km_recorridos, gasto_gasolina, precio_gasolina, notas, image_url
    )
    VALUES (
      ${fecha}, ${placa}, ${consorcio}, ${ruta_id}, ${ruta_nombre}, ${m3},
      ${precio_facturado_m3km}, ${precio_cobrado_m3km},
      ${km_recorridos}, ${gasto_gasolina}, ${precio_gasolina}, ${notas}, ${image_url}
    )
    RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}
