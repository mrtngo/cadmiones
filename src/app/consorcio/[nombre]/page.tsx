"use client";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, H2, Label, Stat, btnGhostCls, inputCls } from "@/components/ui";
import { money, num } from "@/lib/format";
import type { Vehiculo, Registro, Anticipo } from "@/lib/types";

export default function ConsorcioPage({
  params,
}: {
  params: Promise<{ nombre: string }>;
}) {
  const { nombre: raw } = use(params);
  const nombre = decodeURIComponent(raw);

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  async function loadAll() {
    const qs = new URLSearchParams();
    qs.set("consorcio", nombre);
    if (desde) qs.set("desde", desde);
    if (hasta) qs.set("hasta", hasta);
    const [vs, rs, as] = await Promise.all([
      fetch("/api/vehiculos").then((r) => r.json()),
      fetch(`/api/registros?${qs}`).then((r) => r.json()),
      fetch(`/api/anticipos?${qs}`).then((r) => r.json()),
    ]);
    setVehiculos(vs);
    setRegistros(rs);
    setAnticipos(as);
  }

  useEffect(() => { loadAll(); }, [desde, hasta, nombre]);

  const tarifa = useMemo(() => new Map(vehiculos.map((v) => [v.placa, v.precio_por_km])), [vehiculos]);
  const meta = useMemo(() => new Map(vehiculos.map((v) => [v.placa, v])), [vehiculos]);

  const totals = useMemo(() => {
    const km = registros.reduce((s, r) => s + r.km_recorridos, 0);
    const gasto = registros.reduce((s, r) => s + r.gasto_gasolina, 0);
    const ingreso = registros.reduce((s, r) => s + r.km_recorridos * (tarifa.get(r.placa) ?? 0), 0);
    const ant = anticipos.reduce((s, a) => s + a.monto, 0);
    return { km, gasto, ingreso, anticipos: ant, neto: ingreso - ant };
  }, [registros, anticipos, tarifa]);

  // Desglose por placa (sólo placas que tuvieron actividad con este consorcio)
  const perPlaca = useMemo(() => {
    const placas = new Set<string>([
      ...registros.map((r) => r.placa),
      ...anticipos.map((a) => a.placa),
    ]);
    return [...placas].map((placa) => {
      const v = meta.get(placa);
      const rs = registros.filter((r) => r.placa === placa);
      const as = anticipos.filter((a) => a.placa === placa);
      const km = rs.reduce((s, r) => s + r.km_recorridos, 0);
      const gasto = rs.reduce((s, r) => s + r.gasto_gasolina, 0);
      const rate = v?.precio_por_km ?? 0;
      const ingreso = km * rate;
      const ant = as.reduce((s, a) => s + a.monto, 0);
      return { placa, v, km, gasto, ingreso, anticipos: ant, neto: ingreso - ant };
    }).sort((a, b) => b.ingreso - a.ingreso);
  }, [registros, anticipos, meta]);

  const placasActuales = useMemo(
    () => vehiculos.filter((v) => v.consorcio_actual === nombre),
    [vehiculos, nombre]
  );

  return (
    <div className="space-y-6">
      <section>
        <Link href="/" className="text-xs text-zinc-500 hover:underline">← Tablero</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">{nombre}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Trabajando actualmente: {placasActuales.length
            ? placasActuales.map((v) => v.placa).join(" · ")
            : "—"}
        </p>
      </section>

      <Card>
        <H2>Filtros</H2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Desde</Label>
            <input className={inputCls} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <Label>Hasta</Label>
            <input className={inputCls} type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Km" value={num(totals.km)} />
        <Stat label="Ingreso bruto" value={money(totals.ingreso)} />
        <Stat label="Anticipos" value={money(totals.anticipos)} />
        <Stat label="Neto a cobrar" value={money(totals.neto)} hint="bruto − anticipos" />
        <Stat label="Gasto gasolina" value={money(totals.gasto)} />
      </section>

      <Card>
        <H2>Por placa (histórico para este consorcio)</H2>
        {perPlaca.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin actividad registrada con este consorcio.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-3">Placa</th>
                  <th className="py-2 pr-3">Propietario</th>
                  <th className="py-2 pr-3 text-right">Tarifa</th>
                  <th className="py-2 pr-3 text-right">Km</th>
                  <th className="py-2 pr-3 text-right">Ingreso</th>
                  <th className="py-2 pr-3 text-right">Anticipos</th>
                  <th className="py-2 pr-3 text-right">Neto</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {perPlaca.map((p) => (
                  <tr key={p.placa}>
                    <td className="py-2 pr-3 font-semibold">{p.placa}</td>
                    <td className="py-2 pr-3 text-zinc-500">{p.v?.propietario ?? "—"}</td>
                    <td className="py-2 pr-3 text-right text-zinc-500">{money(p.v?.precio_por_km ?? 0)}</td>
                    <td className="py-2 pr-3 text-right">{num(p.km, 1)}</td>
                    <td className="py-2 pr-3 text-right">{money(p.ingreso)}</td>
                    <td className="py-2 pr-3 text-right">{money(p.anticipos)}</td>
                    <td className={`py-2 pr-3 text-right font-semibold ${p.neto >= 0 ? "" : "text-red-600"}`}>{money(p.neto)}</td>
                    <td className="py-2 text-right">
                      <Link href={`/cliente?placa=${p.placa}&consorcio=${encodeURIComponent(nombre)}`} className={btnGhostCls}>Detalle</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <H2>Anticipos</H2>
        {anticipos.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin anticipos en el rango.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Placa</th>
                  <th className="py-2 pr-3 text-right">Monto</th>
                  <th className="py-2 pr-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {anticipos.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-3 whitespace-nowrap">{a.fecha}</td>
                    <td className="py-2 pr-3 font-medium">{a.placa}</td>
                    <td className="py-2 pr-3 text-right">{money(a.monto)}</td>
                    <td className="py-2 pr-3 text-zinc-500">{a.notas ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
