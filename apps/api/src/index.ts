import { readFileSync } from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import { buildApp } from "./app.js";
import { createDb, createSql } from "./db/client.js";
import { createLocalObjectStore } from "./vendors/storage.js";
import { createStubTranscriptionVendor } from "./vendors/transcription.js";
import { createFakeMessagingVendor } from "./vendors/messaging.js";
import { createFakePmsAdapter } from "./vendors/pms.js";

const config = loadConfig();
const sql = createSql(config.databaseUrl, config.databaseSsl);
const ctx = {
  db: createDb(sql),
  config,
  storage: createLocalObjectStore(path.resolve(".data/objects"), config.encryptionKey),
  transcription: createStubTranscriptionVendor(),
  messaging: createFakeMessagingVendor(),
  pms: createFakePmsAdapter(),
};

const https =
  config.tls.certPath && config.tls.keyPath
    ? {
        https: {
          cert: readFileSync(config.tls.certPath),
          key: readFileSync(config.tls.keyPath),
        },
      }
    : {};

const app = await buildApp(ctx, https);
await app.listen({ host: config.host, port: config.port });
const scheme = https.https ? "https" : "http";
console.log(`Olive API listening on ${scheme}://${config.host}:${config.port} (residency ${config.residencyRegion})`);
