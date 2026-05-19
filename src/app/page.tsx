"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, H2, Label, Stat, btnCls, btnGhostCls, inputCls } from "@/components/ui";
import { money, num, today } from "@/lib/format";
import type { Vehiculo, Registro, Anticipo } from "@/lib/types";

type Resumen = {
  placa: string;
  alias: string | null;
  precio_por_km: number;
  km: number;
  gasto: number;
  ingreso: number;
  anticipos: number;
  neto: number;
};

export default function HomePage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
  const [placa, setPlaca] = useState("");
  const [alias, setAlias] = useState("");
  const [precio, setPrecio] = useState("");
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
      body: JSON.stringify({ placa, alias, precio_por_km: Number(precio || 0) }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "error");
      return;
    }
    setPlaca(""); setAlias(""); setPrecio("");
    loadAll();
  }

  async function delVehiculo(p: string) {
    if (!confirm(`Eliminar ${p} y todos sus registros/anticipos?`)) return;
    await fetch(`/api/vehiculos/${encodeURIComponent(p)}`, { method: "DELETE" });
    loadAll();
  }

  const resumen: Resumen[] = vehiculos.map((v) => {
    const rs = registros.filter((r) => r.placa === v.placa);
    const as = anticipos.filter((a) => a.placa === v.placa);
    const km = rs.reduce((s, r) => s + r.km_recorridos, 0);
    const gasto = rs.reduce((s, r) => s + r.gasto_gasolina, 0);
    const ingreso = km * v.precio_por_km;
    const ant = as.reduce((s, a) => s + a.monto, 0);
    return {
      placa: v.placa,
      alias: v.alias,
      precio_por_km: v.precio_por_km,
      km, gasto, ingreso,
      anticipos: ant,
      neto: ingreso - ant,
    };
  });

  const totalKm = resumen.reduce((s, r) => s + r.km, 0);
  const totalIngreso = resumen.reduce((s, r) => s + r.ingreso, 0);
  const totalAnticipos = resumen.reduce((s, r) => s + r.anticipos, 0);
  const totalGasto = resumen.reduce((s, r) => s + r.gasto, 0);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Tablero general</h1>
        <p className="text-sm text-zinc-500 mt-1">Resumen acumulado por placa. Hoy: {today()}</p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Km totales" value={num(totalKm)} />
        <Stat label="Ingreso bruto" value={money(totalIngreso)} hint="km × precio/km" />
        <Stat label="Anticipos pagados" value={money(totalAnticipos)} />
        <Stat label="Gasto gasolina" value={money(totalGasto)} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <H2>Agregar vehículo</H2>
          <form onSubmit={addVehiculo} className="space-y-3">
            <div>
              <Label>Placa</Label>
              <input className={inputCls} value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="ABC123" required />
            </div>
            <div>
              <Label>Alias (opcional)</Label>
              <input className={inputCls} value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Camioneta blanca" />
            </div>
            <div>
              <Label>Precio por km</Label>
              <input className={inputCls} type="number" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="1500" />
            </div>
            {err ? <div className="text-sm text-red-600">{err}</div> : null}
            <button type="submit" className={btnCls}>Guardar</button>
          </form>
        </Card>

        <Card>
          <H2>Vehículos</H2>
          {vehiculos.length === 0 ? (
            <p className="text-sm text-zinc-500">Aún no hay vehículos. Agrega uno para empezar.</p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {resumen.map((r) => (
                <li key={r.placa} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{r.placa}{r.alias ? <span className="text-zinc-500 font-normal"> · {r.alias}</span> : null}</div>
                    <div className="text-xs text-zinc-500">{money(r.precio_por_km)} / km · {num(r.km)} km · neto {money(r.neto)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/conductor?placa=${r.placa}`} className={btnGhostCls}>Conductor</Link>
                    <Link href={`/cliente?placa=${r.placa}`} className={btnGhostCls}>Cliente</Link>
                    <button onClick={() => delVehiculo(r.placa)} className="text-xs text-red-600 hover:underline">eliminar</button>
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
