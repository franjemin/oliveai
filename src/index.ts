import path from "node:path";
import { loadConfig } from "./config.js";
import { buildApp } from "./app.js";
import { createDb, createSql } from "./db/client.js";
import { createLocalObjectStore } from "./vendors/storage.js";
import { createStubTranscriptionVendor } from "./vendors/transcription.js";
import { createFakeMessagingVendor } from "./vendors/messaging.js";
import { createFakePmsAdapter } from "./vendors/pms.js";

const config = loadConfig();
const sql = createSql(config.databaseUrl);
const ctx = {
  db: createDb(sql),
  config,
  storage: createLocalObjectStore(path.resolve(".data/objects"), config.encryptionKey),
  transcription: createStubTranscriptionVendor(),
  messaging: createFakeMessagingVendor(),
  pms: createFakePmsAdapter(),
};

const app = await buildApp(ctx);
await app.listen({ host: config.host, port: config.port });
console.log(`Olive API listening on http://${config.host}:${config.port} (residency ${config.residencyRegion})`);
