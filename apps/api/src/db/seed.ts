import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { loadConfig } from "../config.js";
import { DEMO } from "../lib/ids.js";
import { hashPassword } from "../lib/passwords.js";
import { createDb, createSql } from "./client.js";
import { clinics, consents, patients, users, visits } from "./schema.js";

export async function seedDemo(db: import("./client.js").Db, password = "demo"): Promise<void> {
  const existing = await db.select().from(clinics).where(eq(clinics.id, DEMO.clinicId));
  if (existing.length > 0) {
    console.log("demo clinic already seeded");
    return;
  }

  const now = new Date();
  await db.insert(clinics).values({
    id: DEMO.clinicId,
    name: "Harbourfront Dental",
    legalName: "Harbourfront Dental Inc.",
    smsIdentity: "Harbourfront Dental",
    phone: "+1-416-555-0199",
    email: "hello@harbourfront.demo",
    residencyRegion: "ca-central-1",
    country: "CA",
    province: "ON",
    phipaAgreementVersion: null,
    phipaAgreementAckedAt: null,
    phipaAgreementAckedBy: null,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(users).values({
    id: DEMO.userId,
    clinicId: DEMO.clinicId,
    email: "od@demo.olive.local",
    name: "Dr. Maya Chen",
    role: "dentist",
    passwordHash: await hashPassword(password),
    createdAt: now,
  });

  await db.insert(patients).values([
    {
      id: DEMO.patientAlexId,
      clinicId: DEMO.clinicId,
      firstName: "Alex",
      lastName: "Rivera",
      displayName: "Alex Rivera",
      phone: "+1-416-555-0100",
      email: "alex@example.test",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO.patientSamId,
      clinicId: DEMO.clinicId,
      firstName: "Sam",
      lastName: "Park",
      displayName: "Sam Park",
      phone: "+1-416-555-0101",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await db.insert(visits).values({
    id: DEMO.visitAlexId,
    clinicId: DEMO.clinicId,
    patientId: DEMO.patientAlexId,
    providerId: DEMO.userId,
    status: "in_progress",
    startedAt: now,
    createdAt: now,
  });

  await db.insert(consents).values({
    id: "00000000-0000-4000-8000-000000000010",
    clinicId: DEMO.clinicId,
    patientId: DEMO.patientAlexId,
    visitId: null,
    type: "messaging",
    messageClass: "clinical_transactional",
    granted: true,
    grantedAt: now,
    createdBy: DEMO.userId,
    createdAt: now,
  });

  console.log("seeded Harbourfront Dental demo clinic");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const config = loadConfig();
  const sql = createSql(config.databaseUrl, config.databaseSsl);
  const db = createDb(sql);
  try {
    await seedDemo(db, config.demo.password);
  } finally {
    await sql.end();
  }
}
