"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, H2, Label, Stat, btnCls, btnGhostCls, inputCls } from "@/components/ui";
import { money, num, today } from "@/lib/format";
import type { Vehiculo, Registro, Anticipo } from "@/lib/types";

const SIN_PROP = "Sin propietario";
const SIN_CONS = "Sin consorcio";

type Agg = {
  km: number;
  gasto: number;
  ingreso: number;
  anticipos: number;
  neto: number;
};

function aggregate(
  vehiculos: Vehiculo[],
  registros: Registro[],
  anticipos: Anticipo[]
): Agg {
  const tarifa = new Map(vehiculos.map((v) => [v.placa, v.precio_por_km]));
  let km = 0, gasto = 0, ingreso = 0, ant = 0;
  for (const r of registros) {
    km += r.km_recorridos;
    gasto += r.gasto_gasolina;
    ingreso += r.km_recorridos * (tarifa.get(r.placa) ?? 0);
  }
  for (const a of anticipos) ant += a.monto;
  return { km, gasto, ingreso, anticipos: ant, neto: ingreso - ant };
}

export default function HomePage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
  const [form, setForm] = useState({
    placa: "",
    conductor: "",
    propietario: "",
    alias: "",
    volumen: "",
    consorcio: "",
    precio: "",
  });
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    const [vs, rs, as] = await Promise.all([
      fetch("/api/vehiculos").then((r) => r.json()),
      fetch("/api/registros").then((r) => r.json()),
      fetch("/api/anticipos").then((r) => r.json()),
    ]);
    setVehiculos(vs);
    setRegistros(rs);
    setAnticipos(as);
  }

  useEffect(() => { loadAll(); }, []);

  async function addVehiculo(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/vehiculos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placa: form.placa,
        conductor: form.conductor,
        propietario: form.propietario,
        alias: form.alias,
        volumen_m3: form.volumen,
        consorcio_actual: form.consorcio,
        precio_por_km: Number(form.precio || 0),
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "error");
      return;
    }
    setForm({ placa: "", conductor: "", propietario: "", alias: "", volumen: "", consorcio: "", precio: "" });
    loadAll();
  }

  async function delVehiculo(p: string) {
    if (!confirm(`Eliminar ${p} y todos sus registros/anticipos?`)) return;
    await fetch(`/api/vehiculos/${encodeURIComponent(p)}`, { method: "DELETE" });
    loadAll();
  }

  const propietarios = useMemo(() => {
    const groups = new Map<string, Vehiculo[]>();
    for (const v of vehiculos) {
      const key = v.propietario?.trim() || SIN_PROP;
      const list = groups.get(key) ?? [];
      list.push(v);
      groups.set(key, list);
    }
    return [...groups.entries()].map(([nombre, vs]) => {
      const placas = new Set(vs.map((v) => v.placa));
      const rs = registros.filter((r) => placas.has(r.placa));
      const as = anticipos.filter((a) => placas.has(a.placa));
      return { nombre, vehiculos: vs, agg: aggregate(vs, rs, as) };
    }).sort((a, b) => b.agg.neto - a.agg.neto);
  }, [vehiculos, registros, anticipos]);

  // Consorcios: usa el consorcio "congelado" en cada registro/anticipo.
  // Un consorcio puede aparecer aunque hoy ningún vehículo lo tenga como "actual".
  const consorcios = useMemo(() => {
    const allNames = new Set<string>();
    for (const r of registros) allNames.add(r.consorcio?.trim() || SIN_CONS);
    for (const a of anticipos) allNames.add(a.consorcio?.trim() || SIN_CONS);
    for (const v of vehiculos) if (v.consorcio_actual) allNames.add(v.consorcio_actual.trim());

    return [...allNames].map((nombre) => {
      const matches = (val: string | null | undefined) => (val?.trim() || SIN_CONS) === nombre;
      const rs = registros.filter((r) => matches(r.consorcio));
      const as = anticipos.filter((a) => matches(a.consorcio));
      const placas = new Set([...rs.map((r) => r.placa), ...as.map((a) => a.placa)]);
      if (nombre !== SIN_CONS) {
        for (const v of vehiculos) if (v.consorcio_actual?.trim() === nombre) placas.add(v.placa);
      }
      return { nombre, placas: [...placas], agg: aggregate(vehiculos, rs, as) };
    }).sort((a, b) => b.agg.neto - a.agg.neto);
  }, [vehiculos, registros, anticipos]);

  const totals = useMemo(
    () => aggregate(vehiculos, registros, anticipos),
    [vehiculos, registros, anticipos]
  );

  const propietariosKnown = useMemo(
    () => Array.from(new Set(vehiculos.map((v) => v.propietario).filter(Boolean) as string[])),
    [vehiculos]
  );
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
        <h1 className="text-2xl font-bold tracking-tight">Tablero general</h1>
        <p className="text-sm text-zinc-500 mt-1">Hoy: {today()}</p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Km totales" value={num(totals.km)} />
        <Stat label="Ingreso bruto" value={money(totals.ingreso)} hint="km × precio/km" />
        <Stat label="Anticipos pagados" value={money(totals.anticipos)} />
        <Stat label="Gasto gasolina" value={money(totals.gasto)} />
      </section>

      <section>
        <H2>Propietarios</H2>
        {propietarios.length === 0 ? (
          <p className="text-sm text-zinc-500">Aún no hay propietarios. Agregá un vehículo abajo.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {propietarios.map((p) => {
              const real = p.nombre !== SIN_PROP;
              const inner = (
                <div className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 ${real ? "transition-colors group-hover:border-zinc-400 dark:group-hover:border-zinc-500 cursor-pointer" : "opacity-75"}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-semibold tracking-tight">{p.nombre}</h3>
                    <span className="text-xs text-zinc-500">{p.vehiculos.length} placa{p.vehiculos.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 truncate">
                    {p.vehiculos.map((v) => v.placa).join(" · ")}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <Mini label="Km" value={num(p.agg.km)} />
                    <Mini label="Ingreso" value={money(p.agg.ingreso)} />
                    <Mini label="Anticipos" value={money(p.agg.anticipos)} />
                    <Mini label="Neto" value={money(p.agg.neto)} className={p.agg.neto >= 0 ? "" : "text-red-600"} />
                  </div>
                </div>
              );
              return real ? (
                <Link key={p.nombre} href={`/propietario/${encodeURIComponent(p.nombre)}`} className="block group">{inner}</Link>
              ) : (
                <div key={p.nombre}>{inner}</div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <H2>Consorcios</H2>
        {consorcios.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin consorcios todavía. Se crean al cargar registros o anticipos.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {consorcios.map((c) => {
              const real = c.nombre !== SIN_CONS;
              const inner = (
                <div className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 ${real ? "transition-colors group-hover:border-zinc-400 dark:group-hover:border-zinc-500 cursor-pointer" : "opacity-75"}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-semibold tracking-tight">{c.nombre}</h3>
                    <span className="text-xs text-zinc-500">{c.placas.length} placa{c.placas.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 truncate">{c.placas.join(" · ") || "—"}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <Mini label="Km" value={num(c.agg.km)} />
                    <Mini label="Ingreso" value={money(c.agg.ingreso)} />
                    <Mini label="Anticipos" value={money(c.agg.anticipos)} />
                    <Mini label="Neto" value={money(c.agg.neto)} className={c.agg.neto >= 0 ? "" : "text-red-600"} />
                  </div>
                </div>
              );
              return real ? (
                <Link key={c.nombre} href={`/consorcio/${encodeURIComponent(c.nombre)}`} className="block group">{inner}</Link>
              ) : (
                <div key={c.nombre}>{inner}</div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <H2>Agregar vehículo</H2>
          <form onSubmit={addVehiculo} className="space-y-3">
            <div>
              <Label>Placa *</Label>
              <input className={inputCls} value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} placeholder="ABC123" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Conductor</Label>
                <input className={inputCls} value={form.conductor} onChange={(e) => setForm({ ...form, conductor: e.target.value })} placeholder="Pedro" />
              </div>
              <div>
                <Label>Propietario</Label>
                <input className={inputCls} value={form.propietario} onChange={(e) => setForm({ ...form, propietario: e.target.value })} placeholder="Don Juan" list="propietario-list" />
                <datalist id="propietario-list">
                  {propietariosKnown.map((p) => <option key={p} value={p} />)}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Volumen (m³)</Label>
                <input className={inputCls} type="number" step="0.1" value={form.volumen} onChange={(e) => setForm({ ...form, volumen: e.target.value })} placeholder="8" />
              </div>
              <div>
                <Label>Consorcio actual</Label>
                <input className={inputCls} value={form.consorcio} onChange={(e) => setForm({ ...form, consorcio: e.target.value })} placeholder="Constructora X" list="consorcio-list" />
                <datalist id="consorcio-list">
                  {consorciosKnown.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Alias</Label>
                <input className={inputCls} value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} placeholder="Camioneta blanca" />
              </div>
              <div>
                <Label>Precio por km</Label>
                <input className={inputCls} type="number" step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} placeholder="1500" />
              </div>
            </div>
            {err ? <div className="text-sm text-red-600">{err}</div> : null}
            <button type="submit" className={btnCls}>Guardar</button>
          </form>
        </Card>

        <Card>
          <H2>Vehículos</H2>
          {vehiculos.length === 0 ? (
            <p className="text-sm text-zinc-500">Aún no hay vehículos. Agregá uno para empezar.</p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {vehiculos.map((v) => (
                <li key={v.placa} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {v.placa}
                      {v.alias ? <span className="text-zinc-500 font-normal"> · {v.alias}</span> : null}
                      {v.volumen_m3 ? <span className="ml-2 text-xs rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-zinc-600 dark:text-zinc-400">{num(v.volumen_m3, 1)} m³</span> : null}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {v.propietario ? <>prop: <span className="text-zinc-700 dark:text-zinc-300">{v.propietario}</span></> : "sin propietario"}
                      {v.conductor ? <> · cond: <span className="text-zinc-700 dark:text-zinc-300">{v.conductor}</span></> : null}
                      {v.consorcio_actual ? <> · cons: <span className="text-zinc-700 dark:text-zinc-300">{v.consorcio_actual}</span></> : null}
                      {" · "}{money(v.precio_por_km)}/km
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/conductor?placa=${v.placa}`} className={btnGhostCls}>Conductor</Link>
                    <Link href={`/cliente?placa=${v.placa}`} className={btnGhostCls}>Cliente</Link>
                    <button onClick={() => delVehiculo(v.placa)} className="text-xs text-red-600 hover:underline">eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function Mini({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`font-medium ${className}`}>{value}</div>
    </div>
  );
}
