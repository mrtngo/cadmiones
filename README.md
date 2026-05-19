# cadmiones

Control de vehículos con dos vistas: **conductor** (km y gasto de gasolina por día) y **cliente** (km × tarifa = ingreso, menos anticipos = neto a cobrar). Datos separados por **fecha** y **placa**.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Supabase Postgres vía [`postgres`](https://github.com/porsager/postgres)
- Deploy: Vercel

## Páginas

- `/` — alta de vehículos y tablero global por placa.
- `/conductor` — registrar kms y gasto del día, filtros por placa y rango de fechas.
- `/cliente` — registrar anticipos, ver facturable por día y neto a cobrar.

## Setup local

1. Clonar el repo e instalar deps:
   ```bash
   npm install
   ```
2. Copiar `.env.example` → `.env.local` y pegar tu `DATABASE_URL` de Supabase (Transaction Pooler, puerto 6543).
3. Si la base está vacía, aplicar el schema una sola vez desde el SQL Editor de Supabase:
   ```bash
   cat supabase/schema.sql
   ```
4. Levantar:
   ```bash
   npm run dev
   ```

Requiere Node ≥ 20.9.

## Deploy en Vercel

1. Importar este repo en [vercel.com/new](https://vercel.com/new).
2. En **Settings → Environment Variables**, agregar `DATABASE_URL` con la connection string del Transaction Pooler de Supabase.
3. Deploy. Listo.
