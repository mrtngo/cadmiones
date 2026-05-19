export type Vehiculo = {
  placa: string;
  alias: string | null;
  conductor: string | null;
  propietario: string | null;
  precio_por_km: number;
  created_at: string;
};

export type Registro = {
  id: number;
  fecha: string;
  placa: string;
  km_recorridos: number;
  gasto_gasolina: number;
  precio_gasolina: number | null;
  notas: string | null;
  created_at: string;
};

export type Anticipo = {
  id: number;
  fecha: string;
  placa: string;
  monto: number;
  notas: string | null;
  created_at: string;
};
