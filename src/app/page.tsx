"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, H2, Label, Stat, btnCls, btnGhostCls, inputCls } from "@/components/ui";
import { money, num, today } from "@/lib/format";
import { totalesRegistros, vehiculosByPlaca, type Totales } from "@/lib/calc";
import type { Vehiculo, Registro, Anticipo, Combustible, Obra } from "@/lib/types";

const SIN_PROP = "Sin propietario";
const SIN_CONS = "Sin consorcio";

type Group = {
  nombre: string;
  vehiculos: Vehiculo[];
  placas: string[];
  totales: Totales;
  anticipos: number;
};

export default function HomePage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
  const [combustibles, setCombustibles] = useState<Combustible[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [form, setForm] = useState({
    placa: "",
    conductor: "",
    propietario: "",
    alias: "",
    volumen: "",
    consorcio: "",
  });
  const [err, setErr] = useState<string | null>(null);

  // Edit inline
  const [editingPlaca, setEditingPlaca] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    alias: "",
    conductor: "",
    propietario: "",
    volumen: "",
    consorcio: "",
  });
  const [editErr, setEditErr] = useState<string | null>(null);

  function startEdit(v: Vehiculo) {
    setEditingPlaca(v.placa);
    setEditErr(null);
    setEditForm({
      alias: v.alias ?? "",
      conductor: v.conductor ?? "",
      propietario: v.propietario ?? "",
      volumen: v.volumen_m3 != null ? String(v.volumen_m3) : "",
      consorcio: v.consorcio_actual ?? "",
    });
  }

  async function saveEdit(placa: string) {
    setEditErr(null);
    const res = await fetch(`/api/vehiculos/${encodeURIComponent(placa)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alias: editForm.alias,
        conductor: editForm.conductor,
        propietario: editForm.propietario,
        volumen_m3: editForm.volumen,
        consorcio_actual: editForm.consorcio,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setEditErr(j.error ?? "error");
      return;
    }
    setEditingPlaca(null);
    loadAll();
  }

  async function loadAll() {
    const [vs, rs, as, cs, os] = await Promise.all([
      fetch("/api/vehiculos").then((r) => r.json()),
      fetch("/api/registros").then((r) => r.json()),
      fetch("/api/anticipos").then((r) => r.json()),
      fetch("/api/combustibles").then((r) => r.json()),
      fetch("/api/obras").then((r) => r.json()),
    ]);
    setVehiculos(vs);
    setRegistros(rs);
    setAnticipos(as);
    setCombustibles(cs);
    setObras(os);
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
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "error");
      return;
    }
    setForm({ placa: "", conductor: "", propietario: "", alias: "", volumen: "", consorcio: "" });
    loadAll();
  }

  async function delVehiculo(p: string) {
    if (!confirm(`Eliminar ${p} y todos sus registros/anticipos?`)) return;
    await fetch(`/api/vehiculos/${encodeURIComponent(p)}`, { method: "DELETE" });
    loadAll();
  }

  const vByPlaca = useMemo(() => vehiculosByPlaca(vehiculos), [vehiculos]);

  const propietarios: Group[] = useMemo(() => {
    const groups = new Map<string, Vehiculo[]>();
    for (const v of vehiculos) {
      const key = v.propietario?.trim() || SIN_PROP;
      const list = groups.get(key) ?? [];
      list.push(v);
      groups.set(key, list);
    }
    return [...groups.entries()].map(([nombre, vs]) => {
      const placas = vs.map((v) => v.placa);
      const setP = new Set(placas);
      const rs = registros.filter((r) => setP.has(r.placa));
      const as = anticipos.filter((a) => setP.has(a.placa));
      return {
        nombre,
        vehiculos: vs,
        placas,
        totales: totalesRegistros(rs, vByPlaca),
        anticipos: as.reduce((s, a) => s + a.monto, 0),
      };
    }).sort((a, b) => b.totales.facturado - a.totales.facturado);
  }, [vehiculos, registros, anticipos, vByPlaca]);

  const consorcios: Group[] = useMemo(() => {
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
      return {
        nombre,
        vehiculos: vehiculos.filter((v) => placas.has(v.placa)),
        placas: [...placas],
        totales: totalesRegistros(rs, vByPlaca),
        anticipos: as.reduce((s, a) => s + a.monto, 0),
      };
    }).sort((a, b) => b.totales.facturado - a.totales.facturado);
  }, [vehiculos, registros, anticipos, vByPlaca]);

  const totals = useMemo(() => totalesRegistros(registros, vByPlaca), [registros, vByPlaca]);
  const totalAnticipos = useMemo(() => anticipos.reduce((s, a) => s + a.monto, 0), [anticipos]);
  const totalCombustible = useMemo(
    () => combustibles.reduce((s, c) => s + c.monto, 0) + totals.gasto,
    [combustibles, totals.gasto]
  );
  const margenReal = totals.facturado - totals.cobrado - totalCombustible;

  const propietariosKnown = useMemo(
    () => Array.from(new Set(vehiculos.map((v) => v.propietario).filter(Boolean) as string[])),
    [vehiculos]
  );
  const obrasKnown = useMemo(() => obras.map((o) => o.nombre), [obras]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Tablero general</h1>
        <p className="text-sm text-zinc-500 mt-1">Hoy: {today()}</p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Km totales" value={num(totals.km)} />
        <Stat label="Facturado" value={money(totals.facturado)} hint="m³ × km × tarifa" />
        <Stat label="Cobrado (conductor)" value={money(totals.cobrado)} />
        <Stat label="Combustible" value={money(totalCombustible)} />
        <Stat label="Margen" value={money(margenReal)} hint="fact − cobr − comb" />
        <Stat label="Anticipos" value={money(totalAnticipos)} />
      </section>

      <section>
        <H2>Propietarios</H2>
        {propietarios.length === 0 ? (
          <p className="text-sm text-zinc-500">Aún no hay propietarios. Agregá un vehículo abajo.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {propietarios.map((p) => (
              <GroupCard
                key={p.nombre}
                group={p}
                href={p.nombre !== SIN_PROP ? `/propietario/${encodeURIComponent(p.nombre)}` : null}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <H2>Obras</H2>
        {consorcios.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin obras todavía. Se crean desde el menú Obra o al asignarlas a vehículos.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {consorcios.map((c) => (
              <GroupCard
                key={c.nombre}
                group={c}
                href={c.nombre !== SIN_CONS ? `/obra/${encodeURIComponent(c.nombre)}` : null}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <H2>Agregar vehículo</H2>
          <form onSubmit={addVehiculo} className="space-y-3">
            <div>
              <Label>Placa *</Label>
              <input className={inputCls} value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })} placeholder="ABC123" required />
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
                <Label>Obra</Label>
                <input className={inputCls} value={form.consorcio} onChange={(e) => setForm({ ...form, consorcio: e.target.value })} placeholder="Obra Norte" list="obra-list" />
                <datalist id="obra-list">
                  {obrasKnown.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div>
              <Label>Alias</Label>
              <input className={inputCls} value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} placeholder="Camioneta blanca" />
            </div>
            {err ? <div className="text-sm text-red-600">{err}</div> : null}
            <p className="text-xs text-zinc-500">
              La tarifa se define por <strong>ruta</strong> dentro de cada obra. Creá la obra desde el menú Obra y luego asignala al vehículo.
            </p>
            <button type="submit" className={btnCls}>Guardar</button>
          </form>
        </Card>

        <Card>
          <H2>Vehículos</H2>
          {vehiculos.length === 0 ? (
            <p className="text-sm text-zinc-500">Aún no hay vehículos. Agregá uno para empezar.</p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {vehiculos.map((v) => editingPlaca === v.placa ? (
                <li key={v.placa} className="py-3 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div className="font-semibold">{v.placa}</div>
                    <span className="text-xs text-zinc-500">editando</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Alias</Label>
                      <input className={inputCls} value={editForm.alias} onChange={(e) => setEditForm({ ...editForm, alias: e.target.value })} />
                    </div>
                    <div>
                      <Label>Conductor</Label>
                      <input className={inputCls} value={editForm.conductor} onChange={(e) => setEditForm({ ...editForm, conductor: e.target.value })} />
                    </div>
                    <div>
                      <Label>Propietario</Label>
                      <input className={inputCls} value={editForm.propietario} onChange={(e) => setEditForm({ ...editForm, propietario: e.target.value })} list="propietario-list" />
                    </div>
                    <div>
                      <Label>Volumen (m³)</Label>
                      <input className={inputCls} type="number" step="0.1" value={editForm.volumen} onChange={(e) => setEditForm({ ...editForm, volumen: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <Label>Obra</Label>
                      <input className={inputCls} value={editForm.consorcio} onChange={(e) => setEditForm({ ...editForm, consorcio: e.target.value })} list="obra-list" />
                      <p className="text-xs text-zinc-500 mt-1">Solo afecta viajes nuevos. Los viejos conservan su obra histórica.</p>
                    </div>
                  </div>
                  {editErr ? <div className="text-sm text-red-600">{editErr}</div> : null}
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(v.placa)} className={btnCls}>Guardar</button>
                    <button onClick={() => setEditingPlaca(null)} className={btnGhostCls}>Cancelar</button>
                  </div>
                </li>
              ) : (
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
                      {v.consorcio_actual ? <> · obra: <span className="text-zinc-700 dark:text-zinc-300">{v.consorcio_actual}</span></> : null}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(v)} className={btnGhostCls}>Editar</button>
                    <Link href={`/conductor?placa=${v.placa}`} className={btnGhostCls}>Propietario</Link>
                    <Link
                      href={v.consorcio_actual ? `/obra/${encodeURIComponent(v.consorcio_actual)}?placa=${v.placa}` : "/obra"}
                      className={btnGhostCls}
                    >
                      Obra
                    </Link>
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

function GroupCard({ group, href }: { group: Group; href: string | null }) {
  const porCobrar = group.totales.facturado - group.anticipos;
  const inner = (
    <div className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 ${href ? "transition-colors group-hover:border-zinc-400 dark:group-hover:border-zinc-500 cursor-pointer" : "opacity-75"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold tracking-tight">{group.nombre}</h3>
        <span className="text-xs text-zinc-500">{group.placas.length} placa{group.placas.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="mt-1 text-xs text-zinc-500 truncate">{group.placas.join(" · ") || "—"}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Mini label="Km" value={num(group.totales.km)} />
        <Mini label="Facturado" value={money(group.totales.facturado)} />
        <Mini label="Anticipos" value={money(group.anticipos)} />
        <Mini label="Por cobrar" value={money(porCobrar)} className={porCobrar >= 0 ? "" : "text-red-600"} />
      </div>
    </div>
  );
  return href ? <Link href={href} className="block group">{inner}</Link> : <div>{inner}</div>;
}

function Mini({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`font-medium ${className}`}>{value}</div>
    </div>
  );
}
