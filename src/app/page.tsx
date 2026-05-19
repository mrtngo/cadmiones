"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, H2, Label, Stat, btnCls, btnGhostCls, inputCls } from "@/components/ui";
import { money, num, today } from "@/lib/format";
import type { Vehiculo, Registro, Anticipo } from "@/lib/types";

const SIN_PROP = "Sin propietario";

type Agg = {
  placas: string[];
  km: number;
  gasto: number;
  ingreso: number;
  anticipos: number;
  neto: number;
};

function aggFor(
  placas: Set<string>,
  vehiculos: Vehiculo[],
  registros: Registro[],
  anticipos: Anticipo[]
): Agg {
  const tarifa = new Map(vehiculos.map((v) => [v.placa, v.precio_por_km]));
  let km = 0, gasto = 0, ingreso = 0, ant = 0;
  for (const r of registros) {
    if (!placas.has(r.placa)) continue;
    km += r.km_recorridos;
    gasto += r.gasto_gasolina;
    ingreso += r.km_recorridos * (tarifa.get(r.placa) ?? 0);
  }
  for (const a of anticipos) if (placas.has(a.placa)) ant += a.monto;
  return { placas: [...placas], km, gasto, ingreso, anticipos: ant, neto: ingreso - ant };
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
        precio_por_km: Number(form.precio || 0),
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "error");
      return;
    }
    setForm({ placa: "", conductor: "", propietario: "", alias: "", precio: "" });
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
    return [...groups.entries()]
      .map(([nombre, vs]) => {
        const placas = new Set(vs.map((v) => v.placa));
        return { nombre, vehiculos: vs, agg: aggFor(placas, vehiculos, registros, anticipos) };
      })
      .sort((a, b) => b.agg.neto - a.agg.neto);
  }, [vehiculos, registros, anticipos]);

  const totals = useMemo(
    () => aggFor(new Set(vehiculos.map((v) => v.placa)), vehiculos, registros, anticipos),
    [vehiculos, registros, anticipos]
  );

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
              const realProp = p.nombre !== SIN_PROP;
              const href = realProp ? `/propietario/${encodeURIComponent(p.nombre)}` : "#";
              const Wrap = ({ children }: { children: React.ReactNode }) =>
                realProp ? (
                  <Link href={href} className="block group">{children}</Link>
                ) : (
                  <div>{children}</div>
                );
              return (
                <Wrap key={p.nombre}>
                  <div className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 ${realProp ? "transition-colors group-hover:border-zinc-400 dark:group-hover:border-zinc-500 cursor-pointer" : "opacity-75"}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-semibold tracking-tight">{p.nombre}</h3>
                      <span className="text-xs text-zinc-500">{p.vehiculos.length} placa{p.vehiculos.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 truncate">
                      {p.vehiculos.map((v) => v.placa).join(" · ")}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-zinc-500">Km</div>
                        <div className="font-medium">{num(p.agg.km)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Ingreso</div>
                        <div className="font-medium">{money(p.agg.ingreso)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Anticipos</div>
                        <div className="font-medium">{money(p.agg.anticipos)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Neto</div>
                        <div className={`font-semibold ${p.agg.neto >= 0 ? "" : "text-red-600"}`}>{money(p.agg.neto)}</div>
                      </div>
                    </div>
                  </div>
                </Wrap>
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
                  {Array.from(new Set(vehiculos.map((v) => v.propietario).filter(Boolean) as string[])).map((p) => (
                    <option key={p} value={p} />
                  ))}
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
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {v.propietario ? <>prop: <span className="text-zinc-700 dark:text-zinc-300">{v.propietario}</span></> : "sin propietario"}
                      {v.conductor ? <> · cond: <span className="text-zinc-700 dark:text-zinc-300">{v.conductor}</span></> : null}
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
