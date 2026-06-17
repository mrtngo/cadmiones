"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Card, H2, Label, Stat, btnCls, inputCls } from "@/components/ui";
import { ImageUploadField } from "@/components/ImageUploadField";
import { VehiculoSelector } from "@/components/VehiculoSelector";
import { money, num, today } from "@/lib/format";
import { cobradoDeRegistro, facturadoDeRegistro, totalesRegistros, vehiculosByPlaca } from "@/lib/calc";
import type { Vehiculo, Registro, Ruta, Combustible } from "@/lib/types";

function ConductorInner() {
  const search = useSearchParams();
  const initialPlaca = (search.get("placa") ?? "").toUpperCase();

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [combustibles, setCombustibles] = useState<Combustible[]>([]);
  const [placa, setPlaca] = useState(initialPlaca);
  const [consorcio, setConsorcio] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [form, setForm] = useState({
    fecha: today(),
    placa: initialPlaca,
    ruta_id: "",
    km: "",
    notas: "",
    image_url: "",
  });

  async function loadVehiculos() {
    const vs: Vehiculo[] = await fetch("/api/vehiculos").then((r) => r.json());
    setVehiculos(vs);
    if (!form.placa && vs[0]) setForm((f) => ({ ...f, placa: vs[0].placa }));
  }

  async function loadRutas() {
    const rt: Ruta[] = await fetch("/api/rutas").then((r) => r.json());
    setRutas(rt);
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

  async function loadCombustibles() {
    // Combustibles no tienen consorcio — filtramos solo por placa + fechas.
    const qs = new URLSearchParams();
    if (placa) qs.set("placa", placa);
    if (desde) qs.set("desde", desde);
    if (hasta) qs.set("hasta", hasta);
    const cs: Combustible[] = await fetch(`/api/combustibles?${qs}`).then((r) => r.json());
    setCombustibles(cs);
  }

  useEffect(() => { loadVehiculos(); loadRutas(); }, []);
  useEffect(() => { loadRegistros(); loadCombustibles(); }, [placa, consorcio, desde, hasta]);

  const vByPlaca = useMemo(() => vehiculosByPlaca(vehiculos), [vehiculos]);
  const vehiculoForm = useMemo(() => vByPlaca.get(form.placa), [vByPlaca, form.placa]);
  const consorcioForm = vehiculoForm?.consorcio_actual ?? null;
  const rutasForm = useMemo(
    () => (consorcioForm ? rutas.filter((r) => r.consorcio === consorcioForm) : []),
    [rutas, consorcioForm]
  );

  // Si cambia la placa, reseteamos la ruta seleccionada (puede no aplicar al nuevo consorcio)
  useEffect(() => {
    setForm((f) => ({ ...f, ruta_id: "" }));
  }, [form.placa]);

  async function addRegistro(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/registros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: form.fecha,
        placa: form.placa,
        ruta_id: form.ruta_id ? Number(form.ruta_id) : null,
        km_recorridos: Number(form.km || 0),
        notas: form.notas || null,
        image_url: form.image_url || null,
      }),
    });
    if (!res.ok) {
      alert("No se pudo guardar");
      return;
    }
    setForm((f) => ({ ...f, km: "", notas: "", image_url: "" }));
    loadRegistros();
  }

  async function delRegistro(id: number) {
    if (!confirm("Eliminar viaje?")) return;
    await fetch(`/api/registros/${id}`, { method: "DELETE" });
    loadRegistros();
  }

  // Edit viaje inline
  const [editingViajeId, setEditingViajeId] = useState<number | null>(null);
  const [editViaje, setEditViaje] = useState({ fecha: "", km: "", notas: "", image_url: "" });

  function startEditViaje(r: Registro) {
    setEditingViajeId(r.id);
    setEditViaje({ fecha: r.fecha, km: String(r.km_recorridos), notas: r.notas ?? "", image_url: r.image_url ?? "" });
  }

  async function saveEditViaje(id: number) {
    const res = await fetch(`/api/registros/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: editViaje.fecha,
        km_recorridos: Number(editViaje.km || 0),
        notas: editViaje.notas || null,
        image_url: editViaje.image_url || null,
      }),
    });
    if (!res.ok) { alert("No se pudo guardar"); return; }
    setEditingViajeId(null);
    loadRegistros();
  }

  const totales = useMemo(() => totalesRegistros(registros, vByPlaca), [registros, vByPlaca]);
  const dias = useMemo(() => new Set(registros.map((r) => r.fecha)).size, [registros]);
  const gastoCombustible = useMemo(() => {
    const tanqueadas = combustibles.reduce((s, c) => s + c.monto, 0);
    return tanqueadas + totales.gasto; // suma combustibles + gasolina legacy de registros viejos
  }, [combustibles, totales.gasto]);

  const consorciosKnown = useMemo(() => {
    const s = new Set<string>();
    for (const v of vehiculos) if (v.consorcio_actual) s.add(v.consorcio_actual);
    for (const r of registros) if (r.consorcio) s.add(r.consorcio);
    return [...s];
  }, [vehiculos, registros]);

  const rutaSel = useMemo(
    () => (form.ruta_id ? rutas.find((r) => r.id === Number(form.ruta_id)) : undefined),
    [form.ruta_id, rutas]
  );
  const previewKm = Number(form.km || 0);
  const previewM3 = rutaSel?.m3 ?? vehiculoForm?.volumen_m3 ?? 0;
  const m3SourceLabel = rutaSel?.m3 != null ? "ruta" : "camión";
  const previewFacturado = rutaSel ? previewM3 * previewKm * rutaSel.precio_facturado_m3km : 0;
  const previewCobrado = rutaSel ? previewM3 * previewKm * rutaSel.precio_cobrado_m3km : 0;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Vista conductor</h1>
        <p className="text-sm text-zinc-500 mt-1">Viajes por día. Un camión puede tener varias rutas en un mismo día.</p>
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

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Km" value={num(totales.km)} />
        <Stat label="Cobrado (a conductor)" value={money(totales.cobrado)} hint="m³ × km × tarifa" />
        <Stat label="Gasto combustible" value={money(gastoCombustible)} hint="tanqueadas + legacy" />
        <Stat label="Costo / km" value={money(totales.km ? gastoCombustible / totales.km : 0)} hint="gasto ÷ km" />
        <Stat label="Días con viaje" value={num(dias)} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <H2>Registrar viaje</H2>
          <form onSubmit={addRegistro} className="space-y-3">
            <div>
              <Label>Fecha</Label>
              <input className={inputCls} type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
            </div>
            <div>
              <Label>Placa</Label>
              <VehiculoSelector value={form.placa} vehiculos={vehiculos} onChange={(p) => setForm({ ...form, placa: p })} allowAll={false} />
              {vehiculoForm ? (
                <p className="text-xs text-zinc-500 mt-1">
                  {vehiculoForm.volumen_m3 ? `${num(vehiculoForm.volumen_m3, 1)} m³ · ` : ""}
                  consorcio: <strong>{consorcioForm ?? "—"}</strong>
                </p>
              ) : null}
            </div>
            <div>
              <Label>Ruta</Label>
              {consorcioForm ? (
                rutasForm.length > 0 ? (
                  <select
                    className={inputCls}
                    value={form.ruta_id}
                    onChange={(e) => setForm({ ...form, ruta_id: e.target.value })}
                  >
                    <option value="">— Sin ruta —</option>
                    {rutasForm.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}{r.m3 != null ? ` · ${num(r.m3, 1)} m³` : ""} · fact {money(r.precio_facturado_m3km)} / cobr {money(r.precio_cobrado_m3km)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-amber-600">
                    Sin rutas en <strong>{consorcioForm}</strong>.{" "}
                    <Link className="underline" href={`/consorcio/${encodeURIComponent(consorcioForm)}`}>
                      Crear ruta →
                    </Link>
                  </p>
                )
              ) : (
                <p className="text-xs text-zinc-500">El vehículo no tiene consorcio asignado. Asignale uno desde el home antes de registrar viajes con ruta.</p>
              )}
            </div>
            <div>
              <Label>Km del viaje</Label>
              <input className={inputCls} type="number" step="0.1" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} placeholder="120" required />
            </div>
            {rutaSel && previewKm > 0 ? (
              <div className="rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-xs space-y-1">
                <div className="text-zinc-500">Vista previa: {num(previewM3, 1)} m³ ({m3SourceLabel}) × {num(previewKm, 1)} km</div>
                <div className="flex justify-between"><span>Facturado</span><strong>{money(previewFacturado)}</strong></div>
                <div className="flex justify-between"><span>Cobrado</span><strong>{money(previewCobrado)}</strong></div>
                <div className="flex justify-between"><span>Margen bruto</span><strong>{money(previewFacturado - previewCobrado)}</strong></div>
              </div>
            ) : null}
            <div>
              <Label>Notas</Label>
              <input className={inputCls} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Observaciones…" />
            </div>
            <ImageUploadField
              label="Imagen"
              value={form.image_url}
              onChange={(image_url) => setForm({ ...form, image_url })}
              alt="Imagen del viaje"
            />
            <button type="submit" className={btnCls}>Guardar viaje</button>
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
                    <th className="py-2 pr-3">Imagen</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {registros.map((r) => {
                    const v = vByPlaca.get(r.placa);
                    if (editingViajeId === r.id) {
                      const previewKm = Number(editViaje.km || 0);
                      const m3eff = r.m3 ?? v?.volumen_m3 ?? 0;
                      const fact = r.precio_facturado_m3km != null ? m3eff * previewKm * r.precio_facturado_m3km : previewKm * (v?.precio_por_km ?? 0);
                      const cobr = r.precio_cobrado_m3km != null ? m3eff * previewKm * r.precio_cobrado_m3km : 0;
                      return (
                        <tr key={r.id} className="bg-zinc-50 dark:bg-zinc-900/50">
                          <td className="py-2 pr-3"><input className={inputCls} type="date" value={editViaje.fecha} onChange={(e) => setEditViaje({ ...editViaje, fecha: e.target.value })} /></td>
                          <td className="py-2 pr-3 font-medium">{r.placa}</td>
                          <td className="py-2 pr-3 text-zinc-500"><input className={inputCls} value={editViaje.notas} onChange={(e) => setEditViaje({ ...editViaje, notas: e.target.value })} placeholder={r.ruta_nombre ?? "notas"} /></td>
                          <td className="py-2 pr-3"><input className={inputCls + " text-right"} type="number" step="0.1" value={editViaje.km} onChange={(e) => setEditViaje({ ...editViaje, km: e.target.value })} /></td>
                          <td className="py-2 pr-3 text-right text-zinc-500">{money(fact)}</td>
                          <td className="py-2 pr-3 text-right text-zinc-500">{money(cobr)}</td>
                          <td className="py-2 pr-3 min-w-40">
                            <ImageUploadField
                              label="Imagen"
                              value={editViaje.image_url}
                              onChange={(image_url) => setEditViaje({ ...editViaje, image_url })}
                              alt="Imagen del viaje"
                            />
                          </td>
                          <td className="py-2 text-right whitespace-nowrap">
                            <button onClick={() => saveEditViaje(r.id)} className="text-xs text-emerald-600 hover:underline mr-2">guardar</button>
                            <button onClick={() => setEditingViajeId(null)} className="text-xs text-zinc-500 hover:underline">cancelar</button>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={r.id}>
                        <td className="py-2 pr-3 whitespace-nowrap">{r.fecha}</td>
                        <td className="py-2 pr-3 font-medium">{r.placa}</td>
                        <td className="py-2 pr-3 text-zinc-500">{r.ruta_nombre ?? (r.consorcio ?? "—")}</td>
                        <td className="py-2 pr-3 text-right">{num(r.km_recorridos, 1)}</td>
                        <td className="py-2 pr-3 text-right">{money(facturadoDeRegistro(r, v))}</td>
                        <td className="py-2 pr-3 text-right">{money(cobradoDeRegistro(r, v))}</td>
                        <td className="py-2 pr-3">
                          {r.image_url ? (
                            <a href={r.image_url} target="_blank" rel="noreferrer" className="block w-fit">
                              <Image
                                src={r.image_url}
                                alt="Imagen del viaje"
                                width={64}
                                height={48}
                                unoptimized
                                className="h-12 w-16 rounded border border-zinc-200 object-cover dark:border-zinc-800"
                              />
                            </a>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <button onClick={() => startEditViaje(r)} className="text-xs text-zinc-600 dark:text-zinc-400 hover:underline mr-2">editar</button>
                          <button onClick={() => delRegistro(r.id)} className="text-xs text-red-600 hover:underline">eliminar</button>
                        </td>
                      </tr>
                    );
                  })}
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
