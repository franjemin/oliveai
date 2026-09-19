import { and, eq, gte, lt, or } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { dayCloses, followUps, patients, visits } from "../db/schema.js";
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

  const snapshot = {
    date: input.date,
    pendingFollowUps: pending.map((f) => ({
      id: f.id,
      visitId: f.visitId,
      patientId: f.patientId,
      status: f.status,
      messageClass: f.messageClass,
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
    metadata: { date: input.date, pendingCount: pending.length, frontendNotSoT: true },
  });

  return { dayClose: row, pendingCount: pending.length, snapshot };
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

  return {
    date,
    patients: rows.map((r) => ({
      visitId: r.visitId,
      visitStatus: r.visitStatus,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
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
