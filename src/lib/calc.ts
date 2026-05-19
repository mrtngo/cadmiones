import type { Registro, Vehiculo } from "./types";

// Total facturado del viaje. Si tiene snapshot de ruta usa m³ × km × precio_m3km.
// Si no (registro viejo sin ruta), cae al modelo legacy: km × vehiculo.precio_por_km.
export function facturadoDeRegistro(r: Registro, v: Vehiculo | undefined): number {
  if (r.precio_facturado_m3km != null) {
    const m3 = v?.volumen_m3 ?? 0;
    return m3 * r.km_recorridos * r.precio_facturado_m3km;
  }
  return r.km_recorridos * (v?.precio_por_km ?? 0);
}

// Total cobrado (pago al conductor) del viaje. Solo aplica con ruta — sin snapshot, 0.
export function cobradoDeRegistro(r: Registro, v: Vehiculo | undefined): number {
  if (r.precio_cobrado_m3km != null) {
    const m3 = v?.volumen_m3 ?? 0;
    return m3 * r.km_recorridos * r.precio_cobrado_m3km;
  }
  return 0;
}

export type Totales = {
  km: number;
  facturado: number;
  cobrado: number;
  gasto: number;
  margen: number; // facturado − cobrado − gasto
};

export function totalesRegistros(
  registros: Registro[],
  vByPlaca: Map<string, Vehiculo>
): Totales {
  let km = 0, facturado = 0, cobrado = 0, gasto = 0;
  for (const r of registros) {
    const v = vByPlaca.get(r.placa);
    km += r.km_recorridos;
    facturado += facturadoDeRegistro(r, v);
    cobrado += cobradoDeRegistro(r, v);
    gasto += r.gasto_gasolina;
  }
  return { km, facturado, cobrado, gasto, margen: facturado - cobrado - gasto };
}

export function vehiculosByPlaca(vs: Vehiculo[]): Map<string, Vehiculo> {
  return new Map(vs.map((v) => [v.placa, v]));
}
