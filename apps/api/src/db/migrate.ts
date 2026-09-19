import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { loadConfig } from "../config.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export async function applyMigrations(sql: postgres.Sql): Promise<void> {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const id = "0000_init";
  const existing = await sql<{ id: string }[]>`SELECT id FROM schema_migrations WHERE id = ${id}`;
  if (existing.length > 0) return;

  const file = path.resolve(here, "../../drizzle/0000_init.sql");
  const body = await readFile(file, "utf8");
  await sql.begin(async (tx) => {
    await tx.unsafe(body);
    await tx.unsafe(`INSERT INTO schema_migrations (id) VALUES ('${id}')`);
  });
}

export async function applyMigrationsToPglite(exec: (sql: string) => Promise<unknown>): Promise<void> {
  const file = path.resolve(here, "../../drizzle/0000_init.sql");
  const body = await readFile(file, "utf8");
  await exec(body);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const config = loadConfig();
  const sql = postgres(config.databaseUrl, {
    max: 1,
    ssl: config.databaseSsl ? { rejectUnauthorized: true } : false,
  });
  try {
    await applyMigrations(sql);
    console.log("migrations applied");
  } finally {
    await sql.end();
  }
}
