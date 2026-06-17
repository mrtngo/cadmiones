"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, H2, Label, Stat, inputCls } from "@/components/ui";
import { VehiculoSelector } from "@/components/VehiculoSelector";
import { money, num } from "@/lib/format";
import { cobradoDeRegistro, facturadoDeRegistro, totalesRegistros, vehiculosByPlaca } from "@/lib/calc";
import type { Vehiculo, Registro, Anticipo } from "@/lib/types";

export function ClienteInner({ fixedConsorcio }: { fixedConsorcio?: string }) {
  const search = useSearchParams();
  const initialPlaca = (search.get("placa") ?? "").toUpperCase();
  const initialConsorcio = fixedConsorcio ?? search.get("consorcio") ?? "";

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
  const [placa, setPlaca] = useState(initialPlaca);
  const [consorcio, setConsorcio] = useState(initialConsorcio);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const activeConsorcio = fixedConsorcio ?? consorcio;

  async function loadVehiculos() {
    const vs: Vehiculo[] = await fetch("/api/vehiculos").then((r) => r.json());
    setVehiculos(vs);
  }

  async function loadData() {
    const qs = new URLSearchParams();
    if (placa) qs.set("placa", placa);
    if (activeConsorcio) qs.set("consorcio", activeConsorcio);
    if (desde) qs.set("desde", desde);
    if (hasta) qs.set("hasta", hasta);
    const [rs, as] = await Promise.all([
      fetch(`/api/registros?${qs}`).then((r) => r.json()),
      fetch(`/api/anticipos?${qs}`).then((r) => r.json()),
    ]);
    setRegistros(rs);
    setAnticipos(as);
  }

  useEffect(() => { loadVehiculos(); }, []);
  useEffect(() => { loadData(); }, [placa, activeConsorcio, desde, hasta]);

  const vByPlaca = useMemo(() => vehiculosByPlaca(vehiculos), [vehiculos]);
  const totales = useMemo(() => totalesRegistros(registros, vByPlaca), [registros, vByPlaca]);
  const totalAnticipos = useMemo(() => anticipos.reduce((s, a) => s + a.monto, 0), [anticipos]);

  const consorciosKnown = useMemo(() => {
    const s = new Set<string>();
    for (const v of vehiculos) if (v.consorcio_actual) s.add(v.consorcio_actual);
    for (const r of registros) if (r.consorcio) s.add(r.consorcio);
    for (const a of anticipos) if (a.consorcio) s.add(a.consorcio);
    return [...s];
  }, [vehiculos, registros, anticipos]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">{fixedConsorcio ? fixedConsorcio : "Vista obra"}</h1>
        <p className="text-sm text-zinc-500 mt-1">Facturado al consorcio menos anticipos = por cobrar. Cobrado = lo que pagás al conductor.</p>
      </section>

      <Card>
        <H2>Filtros</H2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Placa</Label>
            <VehiculoSelector value={placa} vehiculos={vehiculos} onChange={setPlaca} />
          </div>
          <div>
            <Label>Obra</Label>
            {fixedConsorcio ? (
              <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm font-medium">
                {fixedConsorcio}
              </div>
            ) : (
              <>
                <input className={inputCls} value={consorcio} onChange={(e) => setConsorcio(e.target.value)} placeholder="Todas" list="cliente-cons-list" />
                <datalist id="cliente-cons-list">
                  {consorciosKnown.map((c) => <option key={c} value={c} />)}
                </datalist>
              </>
            )}
          </div>
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
        <Stat label="Km" value={num(totales.km)} />
        <Stat label="Facturado" value={money(totales.facturado)} hint="m³ × km × tarifa" />
        <Stat label="Cobrado (conductor)" value={money(totales.cobrado)} />
        <Stat label="Anticipos" value={money(totalAnticipos)} />
        <Stat label="Por cobrar" value={money(totales.facturado - totalAnticipos)} hint="fact − anticipos" />
      </section>

      <section className="grid grid-cols-1 gap-6">
        <Card>
          <H2>Viajes</H2>
          {registros.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin viajes para el filtro actual.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Placa</th>
                    <th className="py-2 pr-3">Ruta</th>
                    <th className="py-2 pr-3 text-right">Km</th>
                    <th className="py-2 pr-3 text-right">Facturado</th>
                    <th className="py-2 pr-3 text-right">Cobrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {registros.map((r) => {
                    const v = vByPlaca.get(r.placa);
                    return (
                      <tr key={r.id}>
                        <td className="py-2 pr-3 whitespace-nowrap">{r.fecha}</td>
                        <td className="py-2 pr-3 font-medium">{r.placa}</td>
                        <td className="py-2 pr-3 text-zinc-500">{r.ruta_nombre ?? (r.consorcio ?? "—")}</td>
                        <td className="py-2 pr-3 text-right">{num(r.km_recorridos, 1)}</td>
                        <td className="py-2 pr-3 text-right">{money(facturadoDeRegistro(r, v))}</td>
                        <td className="py-2 pr-3 text-right">{money(cobradoDeRegistro(r, v))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <H2>Anticipos</H2>
          {anticipos.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin anticipos para el filtro actual.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Placa</th>
                    <th className="py-2 pr-3">Obra</th>
                    <th className="py-2 pr-3 text-right">Monto</th>
                    <th className="py-2 pr-3">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {anticipos.map((a) => (
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
      </section>
    </div>
  );
}

export default function ClientePage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Cargando…</div>}>
      <ClienteInner />
    </Suspense>
  );
}
