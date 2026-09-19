import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import postgres from "postgres";
import { schema } from "./schema.js";

export type Db = PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>;

export function createSql(databaseUrl: string) {
  return postgres(databaseUrl, { max: 10, prepare: false });
}

export function createDb(sql: ReturnType<typeof postgres>): Db {
  return drizzle(sql, { schema });
}
