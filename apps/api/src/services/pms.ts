import { and, eq } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { notes, patients, pmsImportJobs, pmsWritebacks } from "../db/schema.js";
import { audit } from "../lib/audit.js";
import { notFound, notImplemented } from "../lib/errors.js";
import { newId } from "../lib/ids.js";

export async function importPatients(
  ctx: AppContext,
  input: {
    clinicId: string;
    actorId: string;
    source?: string;
    patients?: Array<{
      externalId: string;
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
      dateOfBirth?: string;
    }>;
  },
) {
  const incoming = input.patients ?? (await ctx.pms.importPatients());
  let created = 0;
  let updated = 0;

  for (const p of incoming) {
    const existing = await ctx.db
      .select()
      .from(patients)
      .where(and(eq(patients.clinicId, input.clinicId), eq(patients.pmsExternalId, p.externalId)));

    if (existing[0]) {
      await ctx.db
        .update(patients)
        .set({
          firstName: p.firstName,
          lastName: p.lastName,
          displayName: `${p.firstName} ${p.lastName}`,
          phone: p.phone ?? existing[0].phone,
          email: p.email ?? existing[0].email,
          dateOfBirth: p.dateOfBirth ?? existing[0].dateOfBirth,
          pmsSource: input.source ?? ctx.pms.source,
          updatedAt: new Date(),
        })
        .where(eq(patients.id, existing[0].id));
      updated += 1;
    } else {
      await ctx.db.insert(patients).values({
        id: newId(),
        clinicId: input.clinicId,
        firstName: p.firstName,
        lastName: p.lastName,
        displayName: `${p.firstName} ${p.lastName}`,
        phone: p.phone,
        email: p.email,
        dateOfBirth: p.dateOfBirth,
        pmsExternalId: p.externalId,
        pmsSource: input.source ?? ctx.pms.source,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      created += 1;
    }
  }

  const [job] = await ctx.db
    .insert(pmsImportJobs)
    .values({
      id: newId(),
      clinicId: input.clinicId,
      source: input.source ?? ctx.pms.source,
      status: "completed",
      stats: { created, updated, total: incoming.length },
      createdAt: new Date(),
    })
    .returning();

  await audit(ctx.db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: "pms.import",
    resourceType: "pms_import_job",
    resourceId: job.id,
    metadata: { created, updated },
  });

  return { job, created, updated };
}

export async function stubOpenDentalWriteback(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; visitId: string; noteId?: string },
) {
  if (input.noteId) {
    const [note] = await ctx.db
      .select()
      .from(notes)
      .where(and(eq(notes.id, input.noteId), eq(notes.clinicId, input.clinicId)));
    if (!note) throw notFound("note");
  }

  const [row] = await ctx.db
    .insert(pmsWritebacks)
    .values({
      id: newId(),
      clinicId: input.clinicId,
      visitId: input.visitId,
      noteId: input.noteId ?? null,
      target: "open_dental",
      status: "flagged_unimplemented",
      error: "Open Dental write-back is stubbed until adapter + BAA path",
      createdAt: new Date(),
    })
    .returning();

  await audit(ctx.db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: "pms.od_writeback_stub",
    resourceType: "pms_writeback",
    resourceId: row.id,
    metadata: { flagged: true, flag: "odWriteback", enabled: ctx.config.flags.odWriteback },
  });

  throw notImplemented("od_writeback_stubbed", "Open Dental write-back is not implemented in v1 Core", {
    flagged: true,
    flag: "odWriteback",
    enabled: ctx.config.flags.odWriteback,
    writebackId: row.id,
  });
}
