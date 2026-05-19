import postgres, { type Sql } from "postgres";

declare global {
  var __cadmionesSql: Sql | undefined;
}

function client(): Sql {
  if (global.__cadmionesSql) return global.__cadmionesSql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está configurada");
  global.__cadmionesSql = postgres(url, {
    prepare: false,
    idle_timeout: 20,
    max: 5,
  });
  return global.__cadmionesSql;
}

// Proxy so callers can use `sql\`...\`` and `sql.x` without the connection
// being opened until the first query. Required because Next collects page
// data at build time and DATABASE_URL is only set at runtime.
export const sql = new Proxy(function () {} as unknown as Sql, {
  get(_t, prop) {
    return (client() as unknown as Record<PropertyKey, unknown>)[prop];
  },
  apply(_t, _this, args) {
    return (client() as unknown as (...a: unknown[]) => unknown)(...args);
  },
}) as Sql;
