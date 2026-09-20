import { and, eq, gte, inArray, lt, or } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { dayCloses, followUps, notes, patients, visits } from "../db/schema.js";
import { audit } from "../lib/audit.js";
import { newId } from "../lib/ids.js";

function dayBounds(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function finishDay(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; date: string },
) {
  const pending = await ctx.db
    .select()
    .from(followUps)
    .where(
      and(
        eq(followUps.clinicId, input.clinicId),
        or(eq(followUps.status, "draft"), eq(followUps.status, "queued"), eq(followUps.status, "failed")),
      ),
    );

  const { start, end } = dayBounds(input.date);
  const dayVisits = await ctx.db
    .select({ id: visits.id, patientId: visits.patientId, status: visits.status })
    .from(visits)
    .where(and(eq(visits.clinicId, input.clinicId), gte(visits.startedAt, start), lt(visits.startedAt, end)));
  const visitIds = dayVisits.map((v) => v.id);
  const draftNotes =
    visitIds.length === 0
      ? []
      : await ctx.db
          .select()
          .from(notes)
          .where(and(eq(notes.clinicId, input.clinicId), eq(notes.status, "draft"), inArray(notes.visitId, visitIds)));

  const unsignedDrafts = draftNotes.map((n) => ({
    noteId: n.id,
    visitId: n.visitId,
    status: n.status,
    updatedAt: n.updatedAt,
  }));

  const snapshot = {
    date: input.date,
    followUpRelease: "after_sign" as const,
    unsignedDrafts,
    pendingFollowUps: pending.map((f) => ({
      id: f.id,
      visitId: f.visitId,
      patientId: f.patientId,
      status: f.status,
      messageClass: f.messageClass,
      release: "after_sign" as const,
    })),
  };

  const [row] = await ctx.db
    .insert(dayCloses)
    .values({
      id: newId(),
      clinicId: input.clinicId,
      date: input.date,
      snapshot,
      finishedAt: new Date(),
      finishedBy: input.actorId,
      createdAt: new Date(),
    })
    .returning();

  await audit(ctx.db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: "day.finish",
    resourceType: "day_close",
    resourceId: row.id,
    metadata: {
      date: input.date,
      pendingCount: pending.length,
      unsignedDraftCount: unsignedDrafts.length,
      followUpRelease: "after_sign",
      frontendNotSoT: true,
    },
  });

  return {
    dayClose: row,
    pendingCount: pending.length,
    unsignedDraftCount: unsignedDrafts.length,
    followUpRelease: "after_sign" as const,
    unsignedDrafts,
    snapshot,
  };
}

export async function dayPatients(ctx: AppContext, clinicId: string, date: string) {
  const { start, end } = dayBounds(date);
  const rows = await ctx.db
    .select({
      visitId: visits.id,
      visitStatus: visits.status,
      startedAt: visits.startedAt,
      endedAt: visits.endedAt,
      patientId: patients.id,
      displayName: patients.displayName,
      phone: patients.phone,
      pmsExternalId: patients.pmsExternalId,
      pmsSource: patients.pmsSource,
    })
    .from(visits)
    .innerJoin(patients, eq(patients.id, visits.patientId))
    .where(and(eq(visits.clinicId, clinicId), gte(visits.startedAt, start), lt(visits.startedAt, end)));

  const visitIds = rows.map((r) => r.visitId);
  const draftNoteVisits =
    visitIds.length === 0
      ? new Set<string>()
      : new Set(
          (
            await ctx.db
              .select({ visitId: notes.visitId })
              .from(notes)
              .where(and(eq(notes.clinicId, clinicId), eq(notes.status, "draft"), inArray(notes.visitId, visitIds)))
          ).map((n) => n.visitId),
        );

  return {
    date,
    followUpRelease: "after_sign" as const,
    patients: rows.map((r) => ({
      visitId: r.visitId,
      visitStatus: r.visitStatus,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      unsignedDraft: draftNoteVisits.has(r.visitId),
      patient: {
        id: r.patientId,
        displayName: r.displayName,
        phone: r.phone,
        source: r.pmsSource ? "imported" : "local",
        pmsExternalId: r.pmsExternalId,
      },
    })),
  };
}

export const emptyDayPatients = {
  date: "",
  patients: [] as unknown[],
};

export const dayPatientsErrorShape = {
  error: "day_feed_unavailable",
  message: "Could not load the day patient feed",
  patients: [] as unknown[],
};
