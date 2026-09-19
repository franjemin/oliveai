import { and, eq } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { noteEdits, notes } from "../db/schema.js";
import { audit } from "../lib/audit.js";
import { conflict, forbidden, notFound } from "../lib/errors.js";
import { newId } from "../lib/ids.js";
import { longRetentionUntil } from "../lib/retention.js";
import { getVisit } from "./consent.js";
import { applyStyle, getStyleProfile, recordStyleFromEdit } from "./style.js";

export async function getOrCreateNote(ctx: AppContext, clinicId: string, visitId: string) {
  const existing = await ctx.db
    .select()
    .from(notes)
    .where(and(eq(notes.clinicId, clinicId), eq(notes.visitId, visitId)));
  if (existing[0]) return existing[0];

  await getVisit(ctx.db, clinicId, visitId);
  const now = new Date();
  const [row] = await ctx.db
    .insert(notes)
    .values({
      id: newId(),
      clinicId,
      visitId,
      body: "",
      status: "draft",
      retentionUntil: longRetentionUntil(now, ctx.config.noteTranscriptRetentionYears),
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return row;
}

export async function patchNote(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; visitId: string; body: string },
) {
  const note = await getOrCreateNote(ctx, input.clinicId, input.visitId);
  if (note.status === "signed") {
    throw forbidden("note_signed_immutable", "Cannot edit a signed note");
  }
  const style = await getStyleProfile(ctx.db, input.clinicId, input.actorId);
  const body = applyStyle(input.body, style);
  const [updated] = await ctx.db
    .update(notes)
    .set({ body, updatedAt: new Date() })
    .where(eq(notes.id, note.id))
    .returning();
  if (note.body !== body) {
    await ctx.db.insert(noteEdits).values({
      id: newId(),
      clinicId: input.clinicId,
      noteId: note.id,
      before: note.body,
      after: body,
      createdBy: input.actorId,
      createdAt: new Date(),
    });
    await recordStyleFromEdit(ctx.db, {
      clinicId: input.clinicId,
      clinicianId: input.actorId,
      before: note.body,
      after: body,
    });
  }
  await audit(ctx.db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: "note.patch",
    resourceType: "note",
    resourceId: note.id,
    metadata: { visitId: input.visitId },
  });
  return updated;
}

export async function signNote(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; visitId: string },
) {
  const note = await getOrCreateNote(ctx, input.clinicId, input.visitId);
  if (note.status === "signed") {
    throw conflict("already_signed", "Note is already signed");
  }
  const now = new Date();
  const snapshot = {
    body: note.body,
    signedAt: now.toISOString(),
    signedBy: input.actorId,
    visitId: input.visitId,
  };
  const [signed] = await ctx.db
    .update(notes)
    .set({
      status: "signed",
      signedAt: now,
      signedBy: input.actorId,
      snapshot,
      updatedAt: now,
    })
    .where(eq(notes.id, note.id))
    .returning();

  await audit(ctx.db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: "note.sign",
    resourceType: "note",
    resourceId: note.id,
    metadata: { visitId: input.visitId },
  });
  return signed;
}

export function assertNeverAutoSign(): void {
  // Notes are draft-until-sign. Callers must invoke signNote explicitly.
}
