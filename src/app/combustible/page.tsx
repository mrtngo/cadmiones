"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, H2, Label, Stat, btnCls, inputCls } from "@/components/ui";
import { VehiculoSelector } from "@/components/VehiculoSelector";
import { money, num, today } from "@/lib/format";
import type { Vehiculo, Combustible } from "@/lib/types";

function CombustibleInner() {
  const search = useSearchParams();
  const initialPlaca = (search.get("placa") ?? "").toUpperCase();

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [combustibles, setCombustibles] = useState<Combustible[]>([]);
  const [placa, setPlaca] = useState(initialPlaca);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [form, setForm] = useState({
    fecha: today(),
    placa: initialPlaca,
    monto: "",
    galones: "",
    precio_galon: "",
    notas: "",
  });

  async function loadVehiculos() {
    const vs: Vehiculo[] = await fetch("/api/vehiculos").then((r) => r.json());
    setVehiculos(vs);
    if (!form.placa && vs[0]) setForm((f) => ({ ...f, placa: vs[0].placa }));
  }

  async function loadCombustibles() {
    const qs = new URLSearchParams();
    if (placa) qs.set("placa", placa);
    if (desde) qs.set("desde", desde);
    if (hasta) qs.set("hasta", hasta);
    const rs: Combustible[] = await fetch(`/api/combustibles?${qs}`).then((r) => r.json());
    setCombustibles(rs);
  }

  useEffect(() => { loadVehiculos(); }, []);
  useEffect(() => { loadCombustibles(); }, [placa, desde, hasta]);

  // Autocompletar entre monto / galones / precio_galon (sin sobreescribir lo que el usuario está tipeando)
  function syncMonto(field: "monto" | "galones" | "precio_galon", value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      const monto = Number(next.monto);
      const galones = Number(next.galones);
      const precio = Number(next.precio_galon);
      if (field === "galones" || field === "precio_galon") {
        if (galones && precio) next.monto = String(Math.round(galones * precio));
      } else if (field === "monto") {
        if (monto && galones && !precio) next.precio_galon = String((monto / galones).toFixed(2));
        else if (monto && precio && !galones) next.galones = String((monto / precio).toFixed(2));
      }
      return next;
    });
  }

  async function addCombustible(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/combustibles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: form.fecha,
        placa: form.placa,
        monto: Number(form.monto || 0),
        galones: form.galones || null,
        precio_galon: form.precio_galon || null,
        notas: form.notas || null,
      }),
    });
    if (!res.ok) {
      alert("No se pudo guardar");
      return;
    }
    setForm((f) => ({ ...f, monto: "", galones: "", precio_galon: "", notas: "" }));
    loadCombustibles();
  }

  async function delCombustible(id: number) {
    if (!confirm("Eliminar tanqueada?")) return;
    await fetch(`/api/combustibles/${id}`, { method: "DELETE" });
    loadCombustibles();
  }

  // Edit tanqueada inline
  const [editingCombId, setEditingCombId] = useState<number | null>(null);
  const [editComb, setEditComb] = useState({ fecha: "", monto: "", galones: "", precio_galon: "", notas: "" });

  function startEditComb(c: Combustible) {
    setEditingCombId(c.id);
    setEditComb({
      fecha: c.fecha,
      monto: String(c.monto),
      galones: c.galones != null ? String(c.galones) : "",
      precio_galon: c.precio_galon != null ? String(c.precio_galon) : "",
      notas: c.notas ?? "",
    });
  }

  async function saveEditComb(id: number) {
    const res = await fetch(`/api/combustibles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: editComb.fecha,
        monto: Number(editComb.monto || 0),
        galones: editComb.galones || null,
        precio_galon: editComb.precio_galon || null,
        notas: editComb.notas || null,
      }),
    });
    if (!res.ok) { alert("No se pudo guardar"); return; }
    setEditingCombId(null);
    loadCombustibles();
  }

  const totales = useMemo(() => {
    const monto = combustibles.reduce((s, c) => s + c.monto, 0);
    const galones = combustibles.reduce((s, c) => s + (c.galones ?? 0), 0);
    const tanqueadas = combustibles.length;
    return {
      monto,
      galones,
      tanqueadas,
      precioPromedio: galones ? monto / galones : 0,
    };
  }, [combustibles]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Combustible</h1>
        <p className="text-sm text-zinc-500 mt-1">Tanqueadas por vehículo. Independiente de los viajes.</p>
      </section>

      <Card>
        <H2>Filtros</H2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Placa</Label>
            <VehiculoSelector value={placa} vehiculos={vehiculos} onChange={setPlaca} />
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
        <Stat label="Gasto total" value={money(totales.monto)} />
        <Stat label="Galones" value={num(totales.galones, 2)} />
        <Stat label="Precio promedio" value={money(totales.precioPromedio)} hint="monto ÷ galones" />
        <Stat label="Tanqueadas" value={num(totales.tanqueadas)} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <H2>Registrar tanqueada</H2>
          <form onSubmit={addCombustible} className="space-y-3">
            <div>
              <Label>Fecha</Label>
              <input className={inputCls} type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
            </div>
            <div>
              <Label>Placa</Label>
              <VehiculoSelector value={form.placa} vehiculos={vehiculos} onChange={(p) => setForm({ ...form, placa: p })} allowAll={false} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Galones</Label>
                <input className={inputCls} type="number" step="0.01" value={form.galones} onChange={(e) => syncMonto("galones", e.target.value)} placeholder="20" />
              </div>
              <div>
                <Label>Precio /galón</Label>
                <input className={inputCls} type="number" step="0.01" value={form.precio_galon} onChange={(e) => syncMonto("precio_galon", e.target.value)} placeholder="15000" />
              </div>
            </div>
            <div>
              <Label>Monto total</Label>
              <input className={inputCls} type="number" step="0.01" value={form.monto} onChange={(e) => syncMonto("monto", e.target.value)} placeholder="300000" required />
              <p className="text-xs text-zinc-500 mt-1">Se calcula solo al cargar dos de los tres campos.</p>
            </div>
            <div>
              <Label>Notas</Label>
              <input className={inputCls} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Estación, kilómetro…" />
            </div>
            <button type="submit" className={btnCls}>Guardar tanqueada</button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <H2>Tanqueadas</H2>
          {combustibles.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin tanqueadas para el filtro actual.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Placa</th>
                    <th className="py-2 pr-3 text-right">Galones</th>
                    <th className="py-2 pr-3 text-right">Precio /gal</th>
                    <th className="py-2 pr-3 text-right">Monto</th>
                    <th className="py-2 pr-3">Notas</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {combustibles.map((c) => editingCombId === c.id ? (
                    <tr key={c.id} className="bg-zinc-50 dark:bg-zinc-900/50">
                      <td className="py-2 pr-3"><input className={inputCls} type="date" value={editComb.fecha} onChange={(e) => setEditComb({ ...editComb, fecha: e.target.value })} /></td>
                      <td className="py-2 pr-3 font-medium">{c.placa}</td>
                      <td className="py-2 pr-3"><input className={inputCls + " text-right"} type="number" step="0.01" value={editComb.galones} onChange={(e) => setEditComb({ ...editComb, galones: e.target.value })} /></td>
                      <td className="py-2 pr-3"><input className={inputCls + " text-right"} type="number" step="0.01" value={editComb.precio_galon} onChange={(e) => setEditComb({ ...editComb, precio_galon: e.target.value })} /></td>
                      <td className="py-2 pr-3"><input className={inputCls + " text-right"} type="number" step="0.01" value={editComb.monto} onChange={(e) => setEditComb({ ...editComb, monto: e.target.value })} /></td>
                      <td className="py-2 pr-3"><input className={inputCls} value={editComb.notas} onChange={(e) => setEditComb({ ...editComb, notas: e.target.value })} /></td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button onClick={() => saveEditComb(c.id)} className="text-xs text-emerald-600 hover:underline mr-2">guardar</button>
                        <button onClick={() => setEditingCombId(null)} className="text-xs text-zinc-500 hover:underline">cancelar</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id}>
                      <td className="py-2 pr-3 whitespace-nowrap">{c.fecha}</td>
                      <td className="py-2 pr-3 font-medium">{c.placa}</td>
                      <td className="py-2 pr-3 text-right text-zinc-500">{c.galones != null ? num(c.galones, 2) : "—"}</td>
                      <td className="py-2 pr-3 text-right text-zinc-500">{c.precio_galon != null ? money(c.precio_galon) : "—"}</td>
                      <td className="py-2 pr-3 text-right font-medium">{money(c.monto)}</td>
                      <td className="py-2 pr-3 text-zinc-500">{c.notas ?? ""}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button onClick={() => startEditComb(c)} className="text-xs text-zinc-600 dark:text-zinc-400 hover:underline mr-2">editar</button>
                        <button onClick={() => delCombustible(c.id)} className="text-xs text-red-600 hover:underline">eliminar</button>
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

export default function CombustiblePage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Cargando…</div>}>
      <CombustibleInner />
    </Suspense>
  );
}
