"use client";
import { use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, H2, Label, Stat, btnCls, btnGhostCls, inputCls } from "@/components/ui";
import { ImageUploadField } from "@/components/ImageUploadField";
import { money, num, today } from "@/lib/format";
import { cobradoDeRegistro, facturadoDeRegistro, totalesRegistros, vehiculosByPlaca } from "@/lib/calc";
import type { Vehiculo, Registro, Anticipo, Combustible, Ruta } from "@/lib/types";

export default function PropietarioPage({
  params,
}: {
  params: Promise<{ nombre: string }>;
}) {
  const { nombre: raw } = use(params);
  const nombre = decodeURIComponent(raw);

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
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
  const [viajeForm, setViajeForm] = useState({
    fecha: today(),
    placa: "",
    ruta_id: "",
    km: "",
    notas: "",
    image_url: "",
  });
  const [editingViajeId, setEditingViajeId] = useState<number | null>(null);
  const [editViaje, setEditViaje] = useState({ fecha: "", km: "", notas: "", image_url: "" });

  async function loadAll() {
    const qs = new URLSearchParams();
    if (desde) qs.set("desde", desde);
    if (hasta) qs.set("hasta", hasta);
    const [vs, rs, rt, as, cs] = await Promise.all([
      fetch("/api/vehiculos").then((r) => r.json()),
      fetch(`/api/registros?${qs}`).then((r) => r.json()),
      fetch("/api/rutas").then((r) => r.json()),
      fetch(`/api/anticipos?${qs}`).then((r) => r.json()),
      fetch(`/api/combustibles?${qs}`).then((r) => r.json()),
    ]);
    setVehiculos(vs);
    setRegistros(rs);
    setRutas(rt);
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
  const selectedViajeVehiculo = useMemo(
    () => mine.find((v) => v.placa === viajeForm.placa),
    [mine, viajeForm.placa]
  );
  const viajeConsorcio = selectedViajeVehiculo?.consorcio_actual ?? null;
  const viajeRutas = useMemo(
    () => (viajeConsorcio ? rutas.filter((r) => r.consorcio === viajeConsorcio) : []),
    [rutas, viajeConsorcio]
  );
  const viajeRutaSel = useMemo(
    () => (viajeForm.ruta_id ? rutas.find((r) => r.id === Number(viajeForm.ruta_id)) : undefined),
    [viajeForm.ruta_id, rutas]
  );
  const viajePreviewKm = Number(viajeForm.km || 0);
  const viajePreviewM3 = viajeRutaSel?.m3 ?? selectedViajeVehiculo?.volumen_m3 ?? 0;
  const viajePreviewFacturado = viajeRutaSel ? viajePreviewM3 * viajePreviewKm * viajeRutaSel.precio_facturado_m3km : 0;
  const viajePreviewCobrado = viajeRutaSel ? viajePreviewM3 * viajePreviewKm * viajeRutaSel.precio_cobrado_m3km : 0;

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

  async function addViaje(e: React.FormEvent) {
    e.preventDefault();
    const vehiculo = mine.find((v) => v.placa === viajeForm.placa);
    if (!vehiculo) {
      alert("Elegí una placa del propietario");
      return;
    }

    const res = await fetch("/api/registros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: viajeForm.fecha,
        placa: vehiculo.placa,
        ruta_id: viajeForm.ruta_id ? Number(viajeForm.ruta_id) : null,
        km_recorridos: Number(viajeForm.km || 0),
        notas: viajeForm.notas || null,
        image_url: viajeForm.image_url || null,
      }),
    });
    if (!res.ok) {
      alert("No se pudo guardar");
      return;
    }
    setViajeForm((f) => ({ ...f, km: "", notas: "", image_url: "" }));
    loadAll();
  }

  async function delViaje(id: number) {
    if (!confirm("Eliminar viaje?")) return;
    await fetch(`/api/registros/${id}`, { method: "DELETE" });
    loadAll();
  }

  function startEditViaje(r: Registro) {
    setEditingViajeId(r.id);
    setEditViaje({
      fecha: r.fecha,
      km: String(r.km_recorridos),
      notas: r.notas ?? "",
      image_url: r.image_url ?? "",
    });
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
    if (!res.ok) {
      alert("No se pudo guardar");
      return;
    }
    setEditingViajeId(null);
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
          <H2>Registrar viaje</H2>
          {mine.length === 0 ? (
            <p className="text-sm text-zinc-500">Este propietario no tiene placas para registrar viajes.</p>
          ) : (
            <form onSubmit={addViaje} className="space-y-3">
              <div>
                <Label>Fecha</Label>
                <input
                  className={inputCls}
                  type="date"
                  value={viajeForm.fecha}
                  onChange={(e) => setViajeForm({ ...viajeForm, fecha: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Placa</Label>
                <select
                  className={inputCls}
                  value={viajeForm.placa}
                  onChange={(e) => setViajeForm({ ...viajeForm, placa: e.target.value, ruta_id: "" })}
                  required
                >
                  <option value="">Elegir placa</option>
                  {mine.map((v) => (
                    <option key={v.placa} value={v.placa}>
                      {v.placa}{v.alias ? ` · ${v.alias}` : ""}
                    </option>
                  ))}
                </select>
                {selectedViajeVehiculo ? (
                  <p className="text-xs text-zinc-500 mt-1">
                    {selectedViajeVehiculo.volumen_m3 ? `${num(selectedViajeVehiculo.volumen_m3, 1)} m³ · ` : ""}
                    obra: <strong>{viajeConsorcio ?? "—"}</strong>
                  </p>
                ) : null}
              </div>
              <div>
                <Label>Ruta</Label>
                {viajeConsorcio ? (
                  viajeRutas.length > 0 ? (
                    <select
                      className={inputCls}
                      value={viajeForm.ruta_id}
                      onChange={(e) => setViajeForm({ ...viajeForm, ruta_id: e.target.value })}
                    >
                      <option value="">Sin ruta</option>
                      {viajeRutas.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}{r.m3 != null ? ` · ${num(r.m3, 1)} m³` : ""} · fact {money(r.precio_facturado_m3km)} / cobr {money(r.precio_cobrado_m3km)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-600">
                      Sin rutas en <strong>{viajeConsorcio}</strong>.{" "}
                      <Link className="underline" href={`/obra/${encodeURIComponent(viajeConsorcio)}`}>
                        Crear ruta
                      </Link>
                    </p>
                  )
                ) : (
                  <p className="text-xs text-zinc-500">La placa no tiene obra asignada.</p>
                )}
              </div>
              <div>
                <Label>Km del viaje</Label>
                <input
                  className={inputCls}
                  type="number"
                  step="0.1"
                  value={viajeForm.km}
                  onChange={(e) => setViajeForm({ ...viajeForm, km: e.target.value })}
                  placeholder="120"
                  required
                />
              </div>
              {viajeRutaSel && viajePreviewKm > 0 ? (
                <div className="rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-xs space-y-1">
                  <div className="text-zinc-500">Vista previa: {num(viajePreviewM3, 1)} m³ × {num(viajePreviewKm, 1)} km</div>
                  <div className="flex justify-between"><span>Facturado</span><strong>{money(viajePreviewFacturado)}</strong></div>
                  <div className="flex justify-between"><span>Cobrado</span><strong>{money(viajePreviewCobrado)}</strong></div>
                  <div className="flex justify-between"><span>Margen bruto</span><strong>{money(viajePreviewFacturado - viajePreviewCobrado)}</strong></div>
                </div>
              ) : null}
              <div>
                <Label>Notas</Label>
                <input
                  className={inputCls}
                  value={viajeForm.notas}
                  onChange={(e) => setViajeForm({ ...viajeForm, notas: e.target.value })}
                  placeholder="Observaciones..."
                />
              </div>
              <ImageUploadField
                label="Imagen"
                value={viajeForm.image_url}
                onChange={(image_url) => setViajeForm({ ...viajeForm, image_url })}
                alt="Imagen del viaje"
              />
              <button type="submit" className={btnCls}>Guardar viaje</button>
            </form>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <H2>Viajes</H2>
          {myRegistros.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin viajes en el rango.</p>
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
                  {myRegistros.map((r) => {
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
                          <td className="py-2 pr-3"><input className={inputCls} value={editViaje.notas} onChange={(e) => setEditViaje({ ...editViaje, notas: e.target.value })} placeholder={r.ruta_nombre ?? "notas"} /></td>
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
                          <button onClick={() => delViaje(r.id)} className="text-xs text-red-600 hover:underline">eliminar</button>
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
