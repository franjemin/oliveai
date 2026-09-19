import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { AppContext } from "../src/context.js";
import type { Db } from "../src/db/client.js";
import { applyMigrationsToPglite } from "../src/db/migrate.js";
import { schema } from "../src/db/schema.js";
import { seedDemo } from "../src/db/seed.js";
import { createFakeMessagingVendor } from "../src/vendors/messaging.js";
import { createFakePmsAdapter } from "../src/vendors/pms.js";
import { createLocalObjectStore } from "../src/vendors/storage.js";
import { createStubTranscriptionVendor } from "../src/vendors/transcription.js";

export type TestKit = {
  app: FastifyInstance;
  ctx: AppContext;
  token: string;
  close: () => Promise<void>;
};

export async function createTestKit(): Promise<TestKit> {
  const client = new PGlite();
  await applyMigrationsToPglite((sql) => client.exec(sql));
  const db = drizzle(client, { schema }) as unknown as Db;
  const config = loadConfig({ nodeEnv: "test", port: 0 });
  const messaging = createFakeMessagingVendor();
  const ctx: AppContext = {
    db,
    config,
    storage: createLocalObjectStore(path.resolve(".data/test-objects"), config.encryptionKey),
    transcription: createStubTranscriptionVendor(),
    messaging,
    pms: createFakePmsAdapter(),
  };
  await seedDemo(db, config.demo.password);
  const app = await buildApp(ctx);
  await app.ready();

  const login = await app.inject({
    method: "POST",
    url: "/v1/auth/login",
    payload: { email: config.demo.email, password: config.demo.password },
  });
  const token = (login.json() as { token: string }).token;

  return {
    app,
    ctx,
    token,
    close: async () => {
      await app.close();
      await client.close();
    },
  };
}

export function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}
