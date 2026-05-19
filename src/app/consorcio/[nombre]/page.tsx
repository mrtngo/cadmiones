"use client";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, H2, Label, Stat, btnCls, btnGhostCls, inputCls } from "@/components/ui";
import { money, num } from "@/lib/format";
import { cobradoDeRegistro, facturadoDeRegistro, totalesRegistros, vehiculosByPlaca } from "@/lib/calc";
import type { Vehiculo, Registro, Anticipo, Ruta } from "@/lib/types";

export default function ConsorcioPage({
  params,
}: {
  params: Promise<{ nombre: string }>;
}) {
  const { nombre: raw } = use(params);
  const nombre = decodeURIComponent(raw);

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Form para nueva ruta
  const [nuevaRuta, setNuevaRuta] = useState({
    nombre: "",
    m3: "",
    facturado: "",
    cobrado: "",
  });
  const [rutaErr, setRutaErr] = useState<string | null>(null);

  async function loadAll() {
    const qs = new URLSearchParams();
    qs.set("consorcio", nombre);
    if (desde) qs.set("desde", desde);
    if (hasta) qs.set("hasta", hasta);
    const [vs, rs, as, rt] = await Promise.all([
      fetch("/api/vehiculos").then((r) => r.json()),
      fetch(`/api/registros?${qs}`).then((r) => r.json()),
      fetch(`/api/anticipos?${qs}`).then((r) => r.json()),
      fetch(`/api/rutas?consorcio=${encodeURIComponent(nombre)}`).then((r) => r.json()),
    ]);
    setVehiculos(vs);
    setRegistros(rs);
    setAnticipos(as);
    setRutas(rt);
  }

  useEffect(() => { loadAll(); }, [desde, hasta, nombre]);

  async function addRuta(e: React.FormEvent) {
    e.preventDefault();
    setRutaErr(null);
    const res = await fetch("/api/rutas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consorcio: nombre,
        nombre: nuevaRuta.nombre,
        m3: nuevaRuta.m3,
        precio_facturado_m3km: Number(nuevaRuta.facturado || 0),
        precio_cobrado_m3km: Number(nuevaRuta.cobrado || 0),
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setRutaErr(j.error ?? "error");
      return;
    }
    setNuevaRuta({ nombre: "", m3: "", facturado: "", cobrado: "" });
    loadAll();
  }

  async function delRuta(id: number) {
    if (!confirm("Eliminar esta ruta? Los registros viejos mantienen su precio snapshot.")) return;
    await fetch(`/api/rutas/${id}`, { method: "DELETE" });
    loadAll();
  }

  const vByPlaca = useMemo(() => vehiculosByPlaca(vehiculos), [vehiculos]);
  const totales = useMemo(() => totalesRegistros(registros, vByPlaca), [registros, vByPlaca]);
  const totalAnticipos = useMemo(() => anticipos.reduce((s, a) => s + a.monto, 0), [anticipos]);

  const perPlaca = useMemo(() => {
    const placas = new Set<string>([
      ...registros.map((r) => r.placa),
      ...anticipos.map((a) => a.placa),
    ]);
    return [...placas].map((placa) => {
      const v = vByPlaca.get(placa);
      const rs = registros.filter((r) => r.placa === placa);
      const as = anticipos.filter((a) => a.placa === placa);
      const t = totalesRegistros(rs, vByPlaca);
      const ant = as.reduce((s, a) => s + a.monto, 0);
      return { placa, v, ...t, anticipos: ant, porCobrar: t.facturado - ant };
    }).sort((a, b) => b.facturado - a.facturado);
  }, [registros, anticipos, vByPlaca]);

  const placasActuales = useMemo(
    () => vehiculos.filter((v) => v.consorcio_actual === nombre),
    [vehiculos, nombre]
  );

  return (
    <div className="space-y-6">
      <section>
        <Link href="/" className="text-xs text-zinc-500 hover:underline">← Tablero</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">{nombre}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Trabajando actualmente: {placasActuales.length
            ? placasActuales.map((v) => v.placa).join(" · ")
            : "—"}
        </p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Km" value={num(totales.km)} />
        <Stat label="Facturado" value={money(totales.facturado)} />
        <Stat label="Cobrado conductor" value={money(totales.cobrado)} />
        <Stat label="Anticipos" value={money(totalAnticipos)} />
        <Stat label="Por cobrar" value={money(totales.facturado - totalAnticipos)} hint="fact − anticipos" />
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

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <H2>Nueva ruta</H2>
          <form onSubmit={addRuta} className="space-y-3">
            <div>
              <Label>Nombre de la ruta</Label>
              <input className={inputCls} value={nuevaRuta.nombre} onChange={(e) => setNuevaRuta({ ...nuevaRuta, nombre: e.target.value })} placeholder="Cantera → Obra norte" required />
            </div>
            <div>
              <Label>m³ por viaje (opcional)</Label>
              <input className={inputCls} type="number" step="0.1" value={nuevaRuta.m3} onChange={(e) => setNuevaRuta({ ...nuevaRuta, m3: e.target.value })} placeholder="Vacío = usar volumen del camión" />
              <p className="text-xs text-zinc-500 mt-1">Si la carga se mide por densidad y difiere del cubicaje del camión, poné el m³ acá. En blanco usa <code>volumen_m3</code> del vehículo.</p>
            </div>
            <div>
              <Label>Precio facturado · m³·km</Label>
              <input className={inputCls} type="number" step="0.01" value={nuevaRuta.facturado} onChange={(e) => setNuevaRuta({ ...nuevaRuta, facturado: e.target.value })} placeholder="1500" />
              <p className="text-xs text-zinc-500 mt-1">Ingreso por m³·km. Total viaje = m³ × km × precio.</p>
            </div>
            <div>
              <Label>Precio cobrado · m³·km</Label>
              <input className={inputCls} type="number" step="0.01" value={nuevaRuta.cobrado} onChange={(e) => setNuevaRuta({ ...nuevaRuta, cobrado: e.target.value })} placeholder="1200" />
              <p className="text-xs text-zinc-500 mt-1">Pago al conductor por m³·km.</p>
            </div>
            {rutaErr ? <div className="text-sm text-red-600">{rutaErr}</div> : null}
            <button type="submit" className={btnCls}>Crear ruta</button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <H2>Rutas</H2>
          {rutas.length === 0 ? (
            <p className="text-sm text-zinc-500">Aún no hay rutas en este consorcio. Creá una y va a aparecer en el dropdown al registrar viajes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3">Ruta</th>
                    <th className="py-2 pr-3 text-right">m³</th>
                    <th className="py-2 pr-3 text-right">Facturado · m³·km</th>
                    <th className="py-2 pr-3 text-right">Cobrado · m³·km</th>
                    <th className="py-2 pr-3 text-right">Margen · m³·km</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {rutas.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-3 font-medium">{r.nombre}</td>
                      <td className="py-2 pr-3 text-right text-zinc-500">{r.m3 != null ? num(r.m3, 1) : <span className="italic">por camión</span>}</td>
                      <td className="py-2 pr-3 text-right">{money(r.precio_facturado_m3km)}</td>
                      <td className="py-2 pr-3 text-right">{money(r.precio_cobrado_m3km)}</td>
                      <td className="py-2 pr-3 text-right">{money(r.precio_facturado_m3km - r.precio_cobrado_m3km)}</td>
                      <td className="py-2 text-right">
                        <button onClick={() => delRuta(r.id)} className="text-xs text-red-600 hover:underline">eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <Card>
        <H2>Por placa (histórico para este consorcio)</H2>
        {perPlaca.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin actividad registrada con este consorcio.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-3">Placa</th>
                  <th className="py-2 pr-3">Propietario</th>
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
                  <tr key={p.placa}>
                    <td className="py-2 pr-3 font-semibold">{p.placa}</td>
                    <td className="py-2 pr-3 text-zinc-500">{p.v?.propietario ?? "—"}</td>
                    <td className="py-2 pr-3 text-right">{num(p.km, 1)}</td>
                    <td className="py-2 pr-3 text-right">{money(p.facturado)}</td>
                    <td className="py-2 pr-3 text-right">{money(p.cobrado)}</td>
                    <td className="py-2 pr-3 text-right">{money(p.anticipos)}</td>
                    <td className={`py-2 pr-3 text-right font-semibold ${p.porCobrar >= 0 ? "" : "text-red-600"}`}>{money(p.porCobrar)}</td>
                    <td className="py-2 text-right">
                      <Link href={`/cliente?placa=${p.placa}&consorcio=${encodeURIComponent(nombre)}`} className={btnGhostCls}>Detalle</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <H2>Viajes recientes</H2>
        {registros.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin viajes registrados.</p>
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
                {registros.slice(0, 20).map((r) => {
                  const v = vByPlaca.get(r.placa);
                  return (
                    <tr key={r.id}>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.fecha}</td>
                      <td className="py-2 pr-3 font-medium">{r.placa}</td>
                      <td className="py-2 pr-3 text-zinc-500">{r.ruta_nombre ?? "—"}</td>
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

      <Card>
        <H2>Anticipos</H2>
        {anticipos.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin anticipos en el rango.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Placa</th>
                  <th className="py-2 pr-3 text-right">Monto</th>
                  <th className="py-2 pr-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {anticipos.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-3 whitespace-nowrap">{a.fecha}</td>
                    <td className="py-2 pr-3 font-medium">{a.placa}</td>
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
