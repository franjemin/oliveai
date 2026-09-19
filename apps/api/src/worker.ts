import path from "node:path";
import { loadConfig } from "./config.js";
import { createDb, createSql } from "./db/client.js";
import { sweepExpiredAudio } from "./services/audio.js";
import { processQueuedJobs } from "./services/transcript.js";
import { createLocalObjectStore } from "./vendors/storage.js";
import { createStubTranscriptionVendor } from "./vendors/transcription.js";
import { createFakeMessagingVendor } from "./vendors/messaging.js";
import { createFakePmsAdapter } from "./vendors/pms.js";
import { notes, transcripts } from "./db/schema.js";
import { lte } from "drizzle-orm";
import { audit } from "./lib/audit.js";

const once = process.argv.includes("--once");
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

async function sweepLongRetention(): Promise<number> {
  const now = new Date();
  const expiredNotes = await ctx.db.select().from(notes).where(lte(notes.retentionUntil, now));
  const expiredTranscripts = await ctx.db.select().from(transcripts).where(lte(transcripts.retentionUntil, now));

  for (const note of expiredNotes) {
    await audit(ctx.db, {
      clinicId: note.clinicId,
      action: "note.retention_due",
      resourceType: "note",
      resourceId: note.id,
      metadata: { independentOfAudio: true },
    });
  }
  for (const transcript of expiredTranscripts) {
    await audit(ctx.db, {
      clinicId: transcript.clinicId,
      action: "transcript.retention_due",
      resourceType: "transcript",
      resourceId: transcript.id,
      metadata: { independentOfAudio: true },
    });
  }
  return expiredNotes.length + expiredTranscripts.length;
}

export async function runWorkerOnce(): Promise<{ transcripts: number; audioDeletes: number; longRetention: number }> {
  const transcriptsProcessed = await processQueuedJobs(ctx);
  const audioDeletes = await sweepExpiredAudio(ctx);
  const longRetention = await sweepLongRetention();
  return { transcripts: transcriptsProcessed, audioDeletes, longRetention };
}

async function loop() {
  const result = await runWorkerOnce();
  console.log("worker tick", result);
  if (once) {
    await sql.end();
    return;
  }
  setTimeout(() => {
    void loop();
  }, 2000);
}

void loop();
