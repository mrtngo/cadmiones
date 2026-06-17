"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, H2 } from "@/components/ui";
import type { Vehiculo } from "@/lib/types";

const SIN_PROP = "Sin propietario";

export default function PropietariosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  useEffect(() => {
    fetch("/api/vehiculos")
      .then((r) => r.json())
      .then((rows: Vehiculo[]) => setVehiculos(rows));
  }, []);

  const propietarios = useMemo(() => {
    const groups = new Map<string, Vehiculo[]>();
    for (const v of vehiculos) {
      const nombre = v.propietario?.trim() || SIN_PROP;
      const list = groups.get(nombre) ?? [];
      list.push(v);
      groups.set(nombre, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [vehiculos]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Propietarios</h1>
        <p className="text-sm text-zinc-500 mt-1">Elegí un propietario para ver sus placas y registrar anticipos.</p>
      </section>

      <Card>
        <H2>Lista</H2>
        {propietarios.length === 0 ? (
          <p className="text-sm text-zinc-500">Aún no hay propietarios. Agregá vehículos desde Inicio.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {propietarios.map(([nombre, placas]) => {
              const disabled = nombre === SIN_PROP;
              const inner = (
                <div className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${disabled ? "opacity-70" : "transition-colors hover:border-zinc-400 dark:hover:border-zinc-500"}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-semibold tracking-tight">{nombre}</h2>
                    <span className="text-xs text-zinc-500">{placas.length} placa{placas.length !== 1 ? "s" : ""}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 truncate">{placas.map((v) => v.placa).join(" · ")}</p>
                </div>
              );

              return disabled ? (
                <div key={nombre}>{inner}</div>
              ) : (
                <Link key={nombre} href={`/propietario/${encodeURIComponent(nombre)}`}>
                  {inner}
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
