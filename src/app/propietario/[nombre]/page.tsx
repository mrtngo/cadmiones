"use client";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, H2, Label, Stat, btnGhostCls, inputCls } from "@/components/ui";
import { money, num } from "@/lib/format";
import { totalesRegistros, vehiculosByPlaca } from "@/lib/calc";
import type { Vehiculo, Registro, Anticipo, Combustible } from "@/lib/types";

export default function PropietarioPage({
  params,
}: {
  params: Promise<{ nombre: string }>;
}) {
  const { nombre: raw } = use(params);
  const nombre = decodeURIComponent(raw);

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
  const [combustibles, setCombustibles] = useState<Combustible[]>([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  async function loadAll() {
    const qs = new URLSearchParams();
    if (desde) qs.set("desde", desde);
    if (hasta) qs.set("hasta", hasta);
    const [vs, rs, as, cs] = await Promise.all([
      fetch("/api/vehiculos").then((r) => r.json()),
      fetch(`/api/registros?${qs}`).then((r) => r.json()),
      fetch(`/api/anticipos?${qs}`).then((r) => r.json()),
      fetch(`/api/combustibles?${qs}`).then((r) => r.json()),
    ]);
    setVehiculos(vs);
    setRegistros(rs);
    setAnticipos(as);
    setCombustibles(cs);
  }

  useEffect(() => { loadAll(); }, [desde, hasta]);

  const mine = useMemo(() => vehiculos.filter((v) => (v.propietario ?? "") === nombre), [vehiculos, nombre]);
  const placas = useMemo(() => new Set(mine.map((v) => v.placa)), [mine]);
  const vByPlaca = useMemo(() => vehiculosByPlaca(mine), [mine]);

  const myRegistros = useMemo(() => registros.filter((r) => placas.has(r.placa)), [registros, placas]);
  const myAnticipos = useMemo(() => anticipos.filter((a) => placas.has(a.placa)), [anticipos, placas]);
  const myCombustibles = useMemo(() => combustibles.filter((c) => placas.has(c.placa)), [combustibles, placas]);

  const totales = useMemo(() => totalesRegistros(myRegistros, vByPlaca), [myRegistros, vByPlaca]);
  const totalAnticipos = useMemo(() => myAnticipos.reduce((s, a) => s + a.monto, 0), [myAnticipos]);
  const totalCombustible = useMemo(
    () => myCombustibles.reduce((s, c) => s + c.monto, 0) + totales.gasto,
    [myCombustibles, totales.gasto]
  );

  const perPlaca = useMemo(() => {
    return mine.map((v) => {
      const rs = myRegistros.filter((r) => r.placa === v.placa);
      const as = myAnticipos.filter((a) => a.placa === v.placa);
      const t = totalesRegistros(rs, vByPlaca);
      const ant = as.reduce((s, a) => s + a.monto, 0);
      return { v, ...t, anticipos: ant, porCobrar: t.facturado - ant };
    });
  }, [mine, myRegistros, myAnticipos, vByPlaca]);

  return (
    <div className="space-y-6">
      <section>
        <Link href="/" className="text-xs text-zinc-500 hover:underline">← Tablero</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">{nombre}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {mine.length} placa{mine.length !== 1 ? "s" : ""} · {mine.map((v) => v.placa).join(" · ") || "sin vehículos"}
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

      <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Km" value={num(totales.km)} />
        <Stat label="Facturado" value={money(totales.facturado)} />
        <Stat label="Cobrado conductor" value={money(totales.cobrado)} />
        <Stat label="Combustible" value={money(totalCombustible)} />
        <Stat label="Anticipos" value={money(totalAnticipos)} />
        <Stat label="Por cobrar" value={money(totales.facturado - totalAnticipos)} hint="fact − anticipos" />
      </section>

      <Card>
        <H2>Por placa</H2>
        {perPlaca.length === 0 ? (
          <p className="text-sm text-zinc-500">Este propietario no tiene vehículos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-3">Placa</th>
                  <th className="py-2 pr-3">Conductor</th>
                  <th className="py-2 pr-3">Consorcio actual</th>
                  <th className="py-2 pr-3 text-right">Km</th>
                  <th className="py-2 pr-3 text-right">Facturado</th>
                  <th className="py-2 pr-3 text-right">Cobrado</th>
                  <th className="py-2 pr-3 text-right">Anticipos</th>
                  <th className="py-2 pr-3 text-right">Por cobrar</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {perPlaca.map((p) => (
                  <tr key={p.v.placa}>
                    <td className="py-2 pr-3 font-semibold">{p.v.placa}</td>
                    <td className="py-2 pr-3 text-zinc-500">{p.v.conductor ?? "—"}</td>
                    <td className="py-2 pr-3 text-zinc-500">{p.v.consorcio_actual ?? "—"}</td>
                    <td className="py-2 pr-3 text-right">{num(p.km, 1)}</td>
                    <td className="py-2 pr-3 text-right">{money(p.facturado)}</td>
                    <td className="py-2 pr-3 text-right">{money(p.cobrado)}</td>
                    <td className="py-2 pr-3 text-right">{money(p.anticipos)}</td>
                    <td className={`py-2 pr-3 text-right font-semibold ${p.porCobrar >= 0 ? "" : "text-red-600"}`}>{money(p.porCobrar)}</td>
                    <td className="py-2 text-right">
                      <Link
                        href={p.v.consorcio_actual ? `/obra/${encodeURIComponent(p.v.consorcio_actual)}?placa=${p.v.placa}` : `/obra?placa=${p.v.placa}`}
                        className={btnGhostCls}
                      >
                        Obra
                      </Link>
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
        {myAnticipos.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin anticipos en el rango.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Placa</th>
                  <th className="py-2 pr-3">Consorcio</th>
                  <th className="py-2 pr-3 text-right">Monto</th>
                  <th className="py-2 pr-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {myAnticipos.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-3 whitespace-nowrap">{a.fecha}</td>
                    <td className="py-2 pr-3 font-medium">{a.placa}</td>
                    <td className="py-2 pr-3 text-zinc-500">{a.consorcio ?? "—"}</td>
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
