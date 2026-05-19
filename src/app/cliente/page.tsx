"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, H2, Label, Stat, btnCls, inputCls } from "@/components/ui";
import { VehiculoSelector } from "@/components/VehiculoSelector";
import { money, num, today } from "@/lib/format";
import { cobradoDeRegistro, facturadoDeRegistro, totalesRegistros, vehiculosByPlaca } from "@/lib/calc";
import type { Vehiculo, Registro, Anticipo } from "@/lib/types";

function ClienteInner() {
  const search = useSearchParams();
  const initialPlaca = (search.get("placa") ?? "").toUpperCase();
  const initialConsorcio = search.get("consorcio") ?? "";

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
  const [placa, setPlaca] = useState(initialPlaca);
  const [consorcio, setConsorcio] = useState(initialConsorcio);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [form, setForm] = useState({
    fecha: today(),
    placa: initialPlaca,
    consorcio: initialConsorcio,
    monto: "",
    notas: "",
  });

  async function loadVehiculos() {
    const vs: Vehiculo[] = await fetch("/api/vehiculos").then((r) => r.json());
    setVehiculos(vs);
    if (!form.placa && vs[0]) {
      setForm((f) => ({
        ...f,
        placa: vs[0].placa,
        consorcio: f.consorcio || vs[0].consorcio_actual || "",
      }));
    }
  }

  async function loadData() {
    const qs = new URLSearchParams();
    if (placa) qs.set("placa", placa);
    if (consorcio) qs.set("consorcio", consorcio);
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
  useEffect(() => { loadData(); }, [placa, consorcio, desde, hasta]);

  function pickPlaca(p: string) {
    const v = vehiculos.find((x) => x.placa === p);
    setForm((f) => ({ ...f, placa: p, consorcio: v?.consorcio_actual ?? f.consorcio }));
  }

  async function addAnticipo(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/anticipos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: form.fecha,
        placa: form.placa,
        consorcio: form.consorcio || null,
        monto: Number(form.monto || 0),
        notas: form.notas || null,
      }),
    });
    if (!res.ok) {
      alert("No se pudo guardar");
      return;
    }
    setForm((f) => ({ ...f, monto: "", notas: "" }));
    loadData();
  }

  async function delAnticipo(id: number) {
    if (!confirm("Eliminar anticipo?")) return;
    await fetch(`/api/anticipos/${id}`, { method: "DELETE" });
    loadData();
  }

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
        <h1 className="text-2xl font-bold tracking-tight">Vista cliente</h1>
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
            <Label>Consorcio</Label>
            <input className={inputCls} value={consorcio} onChange={(e) => setConsorcio(e.target.value)} placeholder="Todos" list="cliente-cons-list" />
            <datalist id="cliente-cons-list">
              {consorciosKnown.map((c) => <option key={c} value={c} />)}
            </datalist>
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

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <H2>Registrar anticipo</H2>
          <form onSubmit={addAnticipo} className="space-y-3">
            <div>
              <Label>Fecha</Label>
              <input className={inputCls} type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
            </div>
            <div>
              <Label>Placa</Label>
              <VehiculoSelector value={form.placa} vehiculos={vehiculos} onChange={pickPlaca} allowAll={false} />
            </div>
            <div>
              <Label>Consorcio</Label>
              <input className={inputCls} value={form.consorcio} onChange={(e) => setForm({ ...form, consorcio: e.target.value })} placeholder="Constructora X" list="cliente-form-cons" />
              <datalist id="cliente-form-cons">
                {consorciosKnown.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <Label>Monto</Label>
              <input className={inputCls} type="number" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} placeholder="200000" required />
            </div>
            <div>
              <Label>Notas</Label>
              <input className={inputCls} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Adelanto semana…" />
            </div>
            <button type="submit" className={btnCls}>Guardar anticipo</button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
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
                    <th className="py-2 pr-3">Consorcio</th>
                    <th className="py-2 pr-3 text-right">Monto</th>
                    <th className="py-2 pr-3">Notas</th>
                    <th className="py-2"></th>
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
                      <td className="py-2 text-right">
                        <button onClick={() => delAnticipo(a.id)} className="text-xs text-red-600 hover:underline">eliminar</button>
                      </td>
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
