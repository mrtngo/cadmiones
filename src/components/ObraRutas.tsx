"use client";

import { useState } from "react";
import { Card, H2, Label, btnCls, inputCls } from "@/components/ui";
import { money, num } from "@/lib/format";
import type { Ruta } from "@/lib/types";

export function ObraRutas({ obra, initialRutas }: { obra: string; initialRutas: Ruta[] }) {
  const [rutas, setRutas] = useState<Ruta[]>(initialRutas);
  const [nuevaRuta, setNuevaRuta] = useState({
    nombre: "",
    m3: "",
    facturado: "",
    cobrado: "",
  });
  const [rutaErr, setRutaErr] = useState<string | null>(null);
  const [editingRutaId, setEditingRutaId] = useState<number | null>(null);
  const [editRuta, setEditRuta] = useState({ nombre: "", m3: "", facturado: "", cobrado: "" });
  const [editRutaErr, setEditRutaErr] = useState<string | null>(null);

  async function loadRutas() {
    const rows: Ruta[] = await fetch(`/api/rutas?consorcio=${encodeURIComponent(obra)}`).then((r) => r.json());
    setRutas(rows);
  }

  async function addRuta(e: React.FormEvent) {
    e.preventDefault();
    setRutaErr(null);
    const res = await fetch("/api/rutas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consorcio: obra,
        nombre: nuevaRuta.nombre,
        m3: nuevaRuta.m3,
        precio_facturado_m3km: Number(nuevaRuta.facturado || 0),
        precio_cobrado_m3km: Number(nuevaRuta.cobrado || 0),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setRutaErr(body.error ?? "No se pudo crear la ruta");
      return;
    }
    setNuevaRuta({ nombre: "", m3: "", facturado: "", cobrado: "" });
    loadRutas();
  }

  function startEditRuta(ruta: Ruta) {
    setEditingRutaId(ruta.id);
    setEditRutaErr(null);
    setEditRuta({
      nombre: ruta.nombre,
      m3: ruta.m3 != null ? String(ruta.m3) : "",
      facturado: String(ruta.precio_facturado_m3km),
      cobrado: String(ruta.precio_cobrado_m3km),
    });
  }

  async function saveEditRuta(id: number) {
    setEditRutaErr(null);
    const res = await fetch(`/api/rutas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: editRuta.nombre,
        m3: editRuta.m3,
        precio_facturado_m3km: Number(editRuta.facturado || 0),
        precio_cobrado_m3km: Number(editRuta.cobrado || 0),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setEditRutaErr(body.error ?? "No se pudo guardar la ruta");
      return;
    }
    setEditingRutaId(null);
    loadRutas();
  }

  async function delRuta(id: number) {
    if (!confirm("Eliminar esta ruta? Los viajes viejos mantienen su precio guardado.")) return;
    await fetch(`/api/rutas/${id}`, { method: "DELETE" });
    loadRutas();
  }

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card>
        <H2>Nueva ruta</H2>
        <form onSubmit={addRuta} className="space-y-3">
          <div>
            <Label>Nombre de la ruta</Label>
            <input
              className={inputCls}
              value={nuevaRuta.nombre}
              onChange={(e) => setNuevaRuta({ ...nuevaRuta, nombre: e.target.value })}
              placeholder="Cantera a obra"
              required
            />
          </div>
          <div>
            <Label>m3 por viaje</Label>
            <input
              className={inputCls}
              type="number"
              step="0.1"
              value={nuevaRuta.m3}
              onChange={(e) => setNuevaRuta({ ...nuevaRuta, m3: e.target.value })}
              placeholder="Vacio = usar volumen del vehiculo"
            />
          </div>
          <div>
            <Label>Precio facturado m3/km</Label>
            <input
              className={inputCls}
              type="number"
              step="0.01"
              value={nuevaRuta.facturado}
              onChange={(e) => setNuevaRuta({ ...nuevaRuta, facturado: e.target.value })}
              placeholder="1500"
            />
          </div>
          <div>
            <Label>Precio cobrado m3/km</Label>
            <input
              className={inputCls}
              type="number"
              step="0.01"
              value={nuevaRuta.cobrado}
              onChange={(e) => setNuevaRuta({ ...nuevaRuta, cobrado: e.target.value })}
              placeholder="1200"
            />
          </div>
          {rutaErr ? <div className="text-sm text-red-600">{rutaErr}</div> : null}
          <button type="submit" className={btnCls}>Crear ruta</button>
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <H2>Rutas</H2>
        {rutas.length === 0 ? (
          <p className="text-sm text-zinc-500">Aun no hay rutas en esta obra. Crea una y va a aparecer al registrar viajes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-3">Ruta</th>
                  <th className="py-2 pr-3 text-right">m3</th>
                  <th className="py-2 pr-3 text-right">Facturado</th>
                  <th className="py-2 pr-3 text-right">Cobrado</th>
                  <th className="py-2 pr-3 text-right">Margen</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {rutas.map((ruta) => editingRutaId === ruta.id ? (
                  <tr key={ruta.id} className="bg-zinc-50 dark:bg-zinc-900/50">
                    <td className="py-2 pr-3">
                      <input className={inputCls} value={editRuta.nombre} onChange={(e) => setEditRuta({ ...editRuta, nombre: e.target.value })} />
                    </td>
                    <td className="py-2 pr-3">
                      <input className={`${inputCls} text-right`} type="number" step="0.1" value={editRuta.m3} onChange={(e) => setEditRuta({ ...editRuta, m3: e.target.value })} />
                    </td>
                    <td className="py-2 pr-3">
                      <input className={`${inputCls} text-right`} type="number" step="0.01" value={editRuta.facturado} onChange={(e) => setEditRuta({ ...editRuta, facturado: e.target.value })} />
                    </td>
                    <td className="py-2 pr-3">
                      <input className={`${inputCls} text-right`} type="number" step="0.01" value={editRuta.cobrado} onChange={(e) => setEditRuta({ ...editRuta, cobrado: e.target.value })} />
                    </td>
                    <td className="py-2 pr-3 text-right text-zinc-500">{money(Number(editRuta.facturado || 0) - Number(editRuta.cobrado || 0))}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button onClick={() => saveEditRuta(ruta.id)} className="text-xs text-emerald-600 hover:underline mr-2">guardar</button>
                      <button onClick={() => setEditingRutaId(null)} className="text-xs text-zinc-500 hover:underline">cancelar</button>
                      {editRutaErr ? <div className="text-xs text-red-600 mt-1">{editRutaErr}</div> : null}
                    </td>
                  </tr>
                ) : (
                  <tr key={ruta.id}>
                    <td className="py-2 pr-3 font-medium">{ruta.nombre}</td>
                    <td className="py-2 pr-3 text-right text-zinc-500">{ruta.m3 != null ? num(ruta.m3, 1) : <span className="italic">vehiculo</span>}</td>
                    <td className="py-2 pr-3 text-right">{money(ruta.precio_facturado_m3km)}</td>
                    <td className="py-2 pr-3 text-right">{money(ruta.precio_cobrado_m3km)}</td>
                    <td className="py-2 pr-3 text-right">{money(ruta.precio_facturado_m3km - ruta.precio_cobrado_m3km)}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button onClick={() => startEditRuta(ruta)} className="text-xs text-zinc-600 dark:text-zinc-400 hover:underline mr-2">editar</button>
                      <button onClick={() => delRuta(ruta.id)} className="text-xs text-red-600 hover:underline">eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}
