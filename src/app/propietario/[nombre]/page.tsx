"use client";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, H2, Label, Stat, btnCls, btnGhostCls, inputCls } from "@/components/ui";
import { money, num, today } from "@/lib/format";
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
  const [anticipoForm, setAnticipoForm] = useState({
    fecha: today(),
    placa: "",
    monto: "",
    notas: "",
  });
  const [editingAntId, setEditingAntId] = useState<number | null>(null);
  const [editAnt, setEditAnt] = useState({ fecha: "", monto: "", consorcio: "", notas: "" });

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
  const selectedAnticipoVehiculo = useMemo(
    () => mine.find((v) => v.placa === anticipoForm.placa),
    [mine, anticipoForm.placa]
  );

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

  async function addAnticipo(e: React.FormEvent) {
    e.preventDefault();
    const vehiculo = mine.find((v) => v.placa === anticipoForm.placa);
    if (!vehiculo) {
      alert("Elegí una placa del propietario");
      return;
    }

    const res = await fetch("/api/anticipos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: anticipoForm.fecha,
        placa: vehiculo.placa,
        consorcio: vehiculo.consorcio_actual || null,
        monto: Number(anticipoForm.monto || 0),
        notas: anticipoForm.notas || null,
      }),
    });
    if (!res.ok) {
      alert("No se pudo guardar");
      return;
    }
    setAnticipoForm((f) => ({ ...f, monto: "", notas: "" }));
    loadAll();
  }

  async function delAnticipo(id: number) {
    if (!confirm("Eliminar anticipo?")) return;
    await fetch(`/api/anticipos/${id}`, { method: "DELETE" });
    loadAll();
  }

  function startEditAnt(a: Anticipo) {
    setEditingAntId(a.id);
    setEditAnt({
      fecha: a.fecha,
      monto: String(a.monto),
      consorcio: a.consorcio ?? "",
      notas: a.notas ?? "",
    });
  }

  async function saveEditAnt(id: number) {
    const res = await fetch(`/api/anticipos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: editAnt.fecha,
        monto: Number(editAnt.monto || 0),
        consorcio: editAnt.consorcio || null,
        notas: editAnt.notas || null,
      }),
    });
    if (!res.ok) {
      alert("No se pudo guardar");
      return;
    }
    setEditingAntId(null);
    loadAll();
  }

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

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <H2>Registrar anticipo</H2>
          {mine.length === 0 ? (
            <p className="text-sm text-zinc-500">Este propietario no tiene placas para asociar anticipos.</p>
          ) : (
            <form onSubmit={addAnticipo} className="space-y-3">
              <div>
                <Label>Fecha</Label>
                <input
                  className={inputCls}
                  type="date"
                  value={anticipoForm.fecha}
                  onChange={(e) => setAnticipoForm({ ...anticipoForm, fecha: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Placa</Label>
                <select
                  className={inputCls}
                  value={anticipoForm.placa}
                  onChange={(e) => setAnticipoForm({ ...anticipoForm, placa: e.target.value })}
                  required
                >
                  <option value="">Elegir placa</option>
                  {mine.map((v) => (
                    <option key={v.placa} value={v.placa}>
                      {v.placa}{v.alias ? ` · ${v.alias}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Obra vinculada</Label>
                <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm font-medium">
                  {selectedAnticipoVehiculo?.consorcio_actual ?? "Sin obra en la placa"}
                </div>
              </div>
              <div>
                <Label>Monto</Label>
                <input
                  className={inputCls}
                  type="number"
                  step="0.01"
                  value={anticipoForm.monto}
                  onChange={(e) => setAnticipoForm({ ...anticipoForm, monto: e.target.value })}
                  placeholder="200000"
                  required
                />
              </div>
              <div>
                <Label>Notas</Label>
                <input
                  className={inputCls}
                  value={anticipoForm.notas}
                  onChange={(e) => setAnticipoForm({ ...anticipoForm, notas: e.target.value })}
                  placeholder="Adelanto semana..."
                />
              </div>
              <button type="submit" className={btnCls}>Guardar anticipo</button>
            </form>
          )}
        </Card>

        <Card className="lg:col-span-2">
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
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {myAnticipos.map((a) => editingAntId === a.id ? (
                  <tr key={a.id} className="bg-zinc-50 dark:bg-zinc-900/50">
                    <td className="py-2 pr-3"><input className={inputCls} type="date" value={editAnt.fecha} onChange={(e) => setEditAnt({ ...editAnt, fecha: e.target.value })} /></td>
                    <td className="py-2 pr-3 font-medium">{a.placa}</td>
                    <td className="py-2 pr-3"><input className={inputCls} value={editAnt.consorcio} onChange={(e) => setEditAnt({ ...editAnt, consorcio: e.target.value })} /></td>
                    <td className="py-2 pr-3"><input className={inputCls + " text-right"} type="number" step="0.01" value={editAnt.monto} onChange={(e) => setEditAnt({ ...editAnt, monto: e.target.value })} /></td>
                    <td className="py-2 pr-3"><input className={inputCls} value={editAnt.notas} onChange={(e) => setEditAnt({ ...editAnt, notas: e.target.value })} /></td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button onClick={() => saveEditAnt(a.id)} className="text-xs text-emerald-600 hover:underline mr-2">guardar</button>
                      <button onClick={() => setEditingAntId(null)} className="text-xs text-zinc-500 hover:underline">cancelar</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={a.id}>
                    <td className="py-2 pr-3 whitespace-nowrap">{a.fecha}</td>
                    <td className="py-2 pr-3 font-medium">{a.placa}</td>
                    <td className="py-2 pr-3 text-zinc-500">{a.consorcio ?? "—"}</td>
                    <td className="py-2 pr-3 text-right">{money(a.monto)}</td>
                    <td className="py-2 pr-3 text-zinc-500">{a.notas ?? ""}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button onClick={() => startEditAnt(a)} className="text-xs text-zinc-600 dark:text-zinc-400 hover:underline mr-2">editar</button>
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
