-- Schema completo de cadmiones. Idempotente.
-- Aplicar en Supabase: SQL Editor → pegar este archivo → Run.

CREATE TABLE IF NOT EXISTS vehiculos (
  placa             TEXT PRIMARY KEY,
  alias             TEXT,
  conductor         TEXT,
  propietario       TEXT,
  volumen_m3        DOUBLE PRECISION,
  consorcio_actual  TEXT,
  precio_por_km     DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehiculos_propietario ON vehiculos(propietario);

-- Una "ruta" es un servicio dentro de un consorcio (e.g. "Cantera → Obra")
-- con su precio facturado (ingreso) y cobrado (pago al conductor), ambos
-- por m³·km. El total del viaje = volumen_m3 (del vehículo) × km × precio.
CREATE TABLE IF NOT EXISTS rutas (
  id                       BIGSERIAL PRIMARY KEY,
  consorcio                TEXT NOT NULL,
  nombre                   TEXT NOT NULL,
  -- m3 opcional por ruta (cuando varía por densidad y no se usa el cubicaje del camión).
  -- NULL = usar el volumen_m3 del vehículo.
  m3                       DOUBLE PRECISION,
  precio_facturado_m3km    DOUBLE PRECISION NOT NULL DEFAULT 0,
  precio_cobrado_m3km      DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (consorcio, nombre)
);
CREATE INDEX IF NOT EXISTS idx_rutas_consorcio ON rutas(consorcio);

-- Un registro = un viaje (un camión puede tener varios por día).
-- ruta_id es FK pero los precios se snapshotean por si la ruta cambia
-- de tarifa o se borra.
CREATE TABLE IF NOT EXISTS registros (
  id                       BIGSERIAL PRIMARY KEY,
  fecha                    TEXT NOT NULL,
  placa                    TEXT NOT NULL REFERENCES vehiculos(placa) ON DELETE CASCADE,
  consorcio                TEXT,
  ruta_id                  BIGINT REFERENCES rutas(id) ON DELETE SET NULL,
  ruta_nombre              TEXT,
  m3                       DOUBLE PRECISION,  -- snapshot del m3 usado (de la ruta o del vehículo)
  precio_facturado_m3km    DOUBLE PRECISION,
  precio_cobrado_m3km      DOUBLE PRECISION,
  km_recorridos            DOUBLE PRECISION NOT NULL DEFAULT 0,
  gasto_gasolina           DOUBLE PRECISION NOT NULL DEFAULT 0,
  precio_gasolina          DOUBLE PRECISION,
  notas                    TEXT,
  image_url                TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_registros_placa_fecha ON registros(placa, fecha);
CREATE INDEX IF NOT EXISTS idx_registros_consorcio ON registros(consorcio);
CREATE INDEX IF NOT EXISTS idx_registros_ruta ON registros(ruta_id);
ALTER TABLE registros ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Tanqueadas. No están atadas a un viaje ni a un consorcio porque se
-- carga combustible cada cierto tiempo, no por viaje.
CREATE TABLE IF NOT EXISTS combustibles (
  id              BIGSERIAL PRIMARY KEY,
  fecha           TEXT NOT NULL,
  placa           TEXT NOT NULL REFERENCES vehiculos(placa) ON DELETE CASCADE,
  monto           DOUBLE PRECISION NOT NULL DEFAULT 0,
  galones         DOUBLE PRECISION,
  precio_galon    DOUBLE PRECISION,
  notas           TEXT,
  image_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_combustibles_placa_fecha ON combustibles(placa, fecha);
ALTER TABLE combustibles ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS anticipos (
  id               BIGSERIAL PRIMARY KEY,
  fecha            TEXT NOT NULL,
  placa            TEXT NOT NULL REFERENCES vehiculos(placa) ON DELETE CASCADE,
  consorcio        TEXT,
  monto            DOUBLE PRECISION NOT NULL,
  notas            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_anticipos_placa_fecha ON anticipos(placa, fecha);
CREATE INDEX IF NOT EXISTS idx_anticipos_consorcio ON anticipos(consorcio);
