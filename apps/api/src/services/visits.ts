import { and, eq } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { visits } from "../db/schema.js";
import { audit } from "../lib/audit.js";
import { conflict } from "../lib/errors.js";
import { newId } from "../lib/ids.js";
import { getPatient } from "./chat.js";
import { getVisit } from "./consent.js";

export async function createVisit(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; patientId: string },
) {
  await getPatient(ctx, input.clinicId, input.patientId);
  const now = new Date();
  const [visit] = await ctx.db
    .insert(visits)
    .values({
      id: newId(),
      clinicId: input.clinicId,
      patientId: input.patientId,
      providerId: input.actorId,
      status: "in_progress",
      startedAt: now,
      createdAt: now,
    })
    .returning();
  await audit(ctx.db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: "visit.create",
    resourceType: "visit",
    resourceId: visit.id,
  });
  return visit;
}

export async function endVisit(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; visitId: string },
) {
  const visit = await getVisit(ctx.db, input.clinicId, input.visitId);
  if (visit.status === "completed" && visit.endedAt) {
    throw conflict("visit_already_ended", "Visit already completed");
  }
  const endedAt = new Date();
  const [updated] = await ctx.db
    .update(visits)
    .set({ status: "completed", endedAt })
    .where(and(eq(visits.id, visit.id), eq(visits.clinicId, input.clinicId)))
    .returning();
  await audit(ctx.db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: "visit.end",
    resourceType: "visit",
    resourceId: visit.id,
    metadata: { audioRetention: "keep", autoPurge: false },
  });
  return updated;
}
