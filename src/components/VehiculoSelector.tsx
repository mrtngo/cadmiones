"use client";
import type { Vehiculo } from "@/lib/types";
import { inputCls } from "./ui";

export function VehiculoSelector({
  value,
  vehiculos,
  onChange,
  allowAll = true,
}: {
  value: string;
  vehiculos: Vehiculo[];
  onChange: (placa: string) => void;
  allowAll?: boolean;
}) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {allowAll ? <option value="">Todas las placas</option> : <option value="">Seleccionar…</option>}
      {vehiculos.map((v) => (
        <option key={v.placa} value={v.placa}>
          {v.placa}{v.alias ? ` · ${v.alias}` : ""}
        </option>
      ))}
    </select>
  );
}
