import { and, eq } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { chatMessages, chatThreads, patients } from "../db/schema.js";
import { audit } from "../lib/audit.js";
import { notFound } from "../lib/errors.js";
import { newId } from "../lib/ids.js";

export async function getPatient(ctx: AppContext, clinicId: string, patientId: string) {
  const [patient] = await ctx.db
    .select()
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)));
  if (!patient) throw notFound("patient");
  return patient;
}

export async function getOrCreateThread(
  ctx: AppContext,
  clinicId: string,
  patientId: string,
  visitId?: string | null,
) {
  const existing = await ctx.db
    .select()
    .from(chatThreads)
    .where(and(eq(chatThreads.clinicId, clinicId), eq(chatThreads.patientId, patientId)));
  if (existing[0]) return existing[0];
  const [thread] = await ctx.db
    .insert(chatThreads)
    .values({
      id: newId(),
      clinicId,
      patientId,
      visitId: visitId ?? null,
      createdAt: new Date(),
    })
    .returning();
  return thread;
}

export async function listChat(ctx: AppContext, clinicId: string, patientId: string) {
  const thread = await getOrCreateThread(ctx, clinicId, patientId);
  const messages = await ctx.db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.clinicId, clinicId), eq(chatMessages.threadId, thread.id)));
  return { thread, messages };
}

export async function postChat(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; patientId: string; body: string; visitId?: string },
) {
  await getPatient(ctx, input.clinicId, input.patientId);
  const thread = await getOrCreateThread(ctx, input.clinicId, input.patientId, input.visitId);
  const [message] = await ctx.db
    .insert(chatMessages)
    .values({
      id: newId(),
      clinicId: input.clinicId,
      threadId: thread.id,
      patientId: input.patientId,
      authorType: "staff",
      authorId: input.actorId,
      body: input.body,
      createdAt: new Date(),
    })
    .returning();
  await audit(ctx.db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: "chat.post",
    resourceType: "chat_message",
    resourceId: message.id,
    metadata: { patientId: input.patientId },
  });
  return message;
}

export function patientProfile(patient: typeof patients.$inferSelect) {
  return {
    id: patient.id,
    displayName: patient.displayName,
    firstName: patient.firstName,
    lastName: patient.lastName,
    phone: patient.phone,
    email: patient.email,
    dateOfBirth: patient.dateOfBirth,
    pms: patient.pmsExternalId
      ? { source: patient.pmsSource, externalId: patient.pmsExternalId }
      : null,
  };
}
