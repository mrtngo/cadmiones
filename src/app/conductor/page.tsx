"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, H2, Label, Stat, btnCls, inputCls } from "@/components/ui";
import { VehiculoSelector } from "@/components/VehiculoSelector";
import { money, num, today } from "@/lib/format";
import type { Vehiculo, Registro } from "@/lib/types";

function ConductorInner() {
  const search = useSearchParams();
  const initialPlaca = (search.get("placa") ?? "").toUpperCase();

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [placa, setPlaca] = useState(initialPlaca);
  const [consorcio, setConsorcio] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [form, setForm] = useState({
    fecha: today(),
    placa: initialPlaca,
    consorcio: "",
    km: "",
    gasto: "",
    precioGasolina: "",
    notas: "",
  });

  async function loadVehiculos() {
    const vs: Vehiculo[] = await fetch("/api/vehiculos").then((r) => r.json());
    setVehiculos(vs);
    if (!form.placa && vs[0]) {
      setForm((f) => ({ ...f, placa: vs[0].placa, consorcio: vs[0].consorcio_actual ?? "" }));
    }
  }

  async function loadRegistros() {
    const qs = new URLSearchParams();
    if (placa) qs.set("placa", placa);
    if (consorcio) qs.set("consorcio", consorcio);
    if (desde) qs.set("desde", desde);
    if (hasta) qs.set("hasta", hasta);
    const rs = await fetch(`/api/registros?${qs}`).then((r) => r.json());
    setRegistros(rs);
  }

  useEffect(() => { loadVehiculos(); }, []);
  useEffect(() => { loadRegistros(); }, [placa, consorcio, desde, hasta]);

  // Cuando cambia la placa del form, prefilleamos consorcio con el del vehículo
  function pickPlaca(p: string) {
    const v = vehiculos.find((x) => x.placa === p);
    setForm((f) => ({ ...f, placa: p, consorcio: v?.consorcio_actual ?? f.consorcio }));
  }

  async function addRegistro(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/registros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: form.fecha,
        placa: form.placa,
        consorcio: form.consorcio || null,
        km_recorridos: Number(form.km || 0),
        gasto_gasolina: Number(form.gasto || 0),
        precio_gasolina: form.precioGasolina ? Number(form.precioGasolina) : null,
        notas: form.notas || null,
      }),
    });
    if (!res.ok) {
      alert("No se pudo guardar");
      return;
    }
    setForm((f) => ({ ...f, km: "", gasto: "", precioGasolina: "", notas: "" }));
    loadRegistros();
  }

  async function delRegistro(id: number) {
    if (!confirm("Eliminar registro?")) return;
    await fetch(`/api/registros/${id}`, { method: "DELETE" });
    loadRegistros();
  }

  const totales = useMemo(() => {
    const km = registros.reduce((s, r) => s + r.km_recorridos, 0);
    const gasto = registros.reduce((s, r) => s + r.gasto_gasolina, 0);
    const dias = new Set(registros.map((r) => r.fecha)).size;
    return { km, gasto, dias, costoPorKm: km ? gasto / km : 0 };
  }, [registros]);

  const consorciosKnown = useMemo(() => {
    const s = new Set<string>();
    for (const v of vehiculos) if (v.consorcio_actual) s.add(v.consorcio_actual);
    for (const r of registros) if (r.consorcio) s.add(r.consorcio);
    return [...s];
  }, [vehiculos, registros]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Vista conductor</h1>
        <p className="text-sm text-zinc-500 mt-1">Km recorridos y gasto de gasolina por día.</p>
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
            <input className={inputCls} value={consorcio} onChange={(e) => setConsorcio(e.target.value)} placeholder="Todos" list="conductor-cons-list" />
            <datalist id="conductor-cons-list">
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

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Km recorridos" value={num(totales.km)} />
        <Stat label="Gasto gasolina" value={money(totales.gasto)} />
        <Stat label="Costo por km" value={money(totales.costoPorKm)} hint="gasto ÷ km" />
        <Stat label="Días con registro" value={num(totales.dias)} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <H2>Registrar día</H2>
          <form onSubmit={addRegistro} className="space-y-3">
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
              <input className={inputCls} value={form.consorcio} onChange={(e) => setForm({ ...form, consorcio: e.target.value })} placeholder="Constructora X" list="conductor-form-cons" />
              <datalist id="conductor-form-cons">
                {consorciosKnown.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <Label>Km recorridos</Label>
              <input className={inputCls} type="number" step="0.1" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} placeholder="120" required />
            </div>
            <div>
              <Label>Gasto gasolina</Label>
              <input className={inputCls} type="number" step="0.01" value={form.gasto} onChange={(e) => setForm({ ...form, gasto: e.target.value })} placeholder="80000" />
            </div>
            <div>
              <Label>Precio gasolina /galón (opcional)</Label>
              <input className={inputCls} type="number" step="0.01" value={form.precioGasolina} onChange={(e) => setForm({ ...form, precioGasolina: e.target.value })} placeholder="15000" />
            </div>
            <div>
              <Label>Notas</Label>
              <input className={inputCls} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Ruta…" />
            </div>
            <button type="submit" className={btnCls}>Guardar registro</button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <H2>Registros</H2>
          {registros.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin registros para el filtro actual.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Placa</th>
                    <th className="py-2 pr-3">Consorcio</th>
                    <th className="py-2 pr-3 text-right">Km</th>
                    <th className="py-2 pr-3 text-right">Gasto</th>
                    <th className="py-2 pr-3 text-right">Precio gas</th>
                    <th className="py-2 pr-3">Notas</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {registros.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.fecha}</td>
                      <td className="py-2 pr-3 font-medium">{r.placa}</td>
                      <td className="py-2 pr-3 text-zinc-500">{r.consorcio ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{num(r.km_recorridos, 1)}</td>
                      <td className="py-2 pr-3 text-right">{money(r.gasto_gasolina)}</td>
                      <td className="py-2 pr-3 text-right text-zinc-500">{r.precio_gasolina ? money(r.precio_gasolina) : "—"}</td>
                      <td className="py-2 pr-3 text-zinc-500">{r.notas ?? ""}</td>
                      <td className="py-2 text-right">
                        <button onClick={() => delRegistro(r.id)} className="text-xs text-red-600 hover:underline">eliminar</button>
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

export default function ConductorPage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Cargando…</div>}>
      <ConductorInner />
    </Suspense>
  );
}
