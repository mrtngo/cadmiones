export type Vehiculo = {
  placa: string;
  alias: string | null;
  conductor: string | null;
  propietario: string | null;
  volumen_m3: number | null;
  consorcio_actual: string | null;
  precio_por_km: number;
  created_at: string;
};

export type Ruta = {
  id: number;
  consorcio: string;
  nombre: string;
  m3: number | null;
  precio_facturado_m3km: number;
  precio_cobrado_m3km: number;
  created_at: string;
};

export type Registro = {
  id: number;
  fecha: string;
  placa: string;
  consorcio: string | null;
  ruta_id: number | null;
  ruta_nombre: string | null;
  m3: number | null;
  precio_facturado_m3km: number | null;
  precio_cobrado_m3km: number | null;
  km_recorridos: number;
  gasto_gasolina: number;
  precio_gasolina: number | null;
  notas: string | null;
  image_url: string | null;
  created_at: string;
};

export type Combustible = {
  id: number;
  fecha: string;
  placa: string;
  monto: number;
  galones: number | null;
  precio_galon: number | null;
  notas: string | null;
  image_url: string | null;
  created_at: string;
};

export type Anticipo = {
  id: number;
  fecha: string;
  placa: string;
  consorcio: string | null;
  monto: number;
  notas: string | null;
  created_at: string;
};
