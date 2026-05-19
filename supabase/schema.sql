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

CREATE TABLE IF NOT EXISTS registros (
  id               BIGSERIAL PRIMARY KEY,
  fecha            TEXT NOT NULL,
  placa            TEXT NOT NULL REFERENCES vehiculos(placa) ON DELETE CASCADE,
  consorcio        TEXT,
  km_recorridos    DOUBLE PRECISION NOT NULL DEFAULT 0,
  gasto_gasolina   DOUBLE PRECISION NOT NULL DEFAULT 0,
  precio_gasolina  DOUBLE PRECISION,
  notas            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_registros_placa_fecha ON registros(placa, fecha);
CREATE INDEX IF NOT EXISTS idx_registros_consorcio ON registros(consorcio);

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
