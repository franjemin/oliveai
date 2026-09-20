import { and, eq, isNull } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { audioAssets, notes, transcripts, visits } from "../db/schema.js";
import { audit } from "../lib/audit.js";
import { forbidden, notFound, unprocessable } from "../lib/errors.js";
import { newId } from "../lib/ids.js";
import { audioObjectKey, checksumOf } from "../vendors/storage.js";
import { recordingGate } from "./consent.js";
import { enqueueTranscription } from "./transcript.js";

export async function ingestAudio(
  ctx: AppContext,
  input: {
    clinicId: string;
    actorId: string;
    visitId: string;
    bytes: Buffer;
    contentType?: string;
  },
) {
  const gate = await recordingGate(ctx.db, input.clinicId, input.visitId);
  if (!gate.allowed) {
    throw forbidden("recording_gate_denied", "No AudioAsset without visit-scoped audio_capture consent", {
      reason: gate.reason,
    });
  }

  const [visit] = await ctx.db
    .select()
    .from(visits)
    .where(and(eq(visits.id, input.visitId), eq(visits.clinicId, input.clinicId)));
  if (!visit) throw notFound("visit");

  const id = newId();
  const objectKey = audioObjectKey(input.clinicId, input.visitId, id);
  await ctx.storage.put(objectKey, input.bytes, input.contentType);

  const [asset] = await ctx.db
    .insert(audioAssets)
    .values({
      id,
      clinicId: input.clinicId,
      visitId: input.visitId,
      objectKey,
      contentType: input.contentType ?? "audio/webm",
      byteSize: input.bytes.length,
      checksum: checksumOf(input.bytes),
      deleteAfter: null,
      createdAt: new Date(),
    })
    .returning();

  await audit(ctx.db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: "audio.ingest",
    resourceType: "audio_asset",
    resourceId: id,
    metadata: {
      visitId: input.visitId,
      disclosureScriptId: gate.disclosureScriptId,
      retention: "keep",
    },
  });

  const job = await enqueueTranscription(ctx, {
    clinicId: input.clinicId,
    visitId: input.visitId,
    audioAssetId: id,
  });

  return { asset, job };
}

async function hardDeleteAssets(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; assets: (typeof audioAssets.$inferSelect)[]; reason: string },
) {
  for (const asset of input.assets) {
    await ctx.storage.delete(asset.objectKey);
    await ctx.db
      .update(audioAssets)
      .set({ deletedAt: new Date() })
      .where(eq(audioAssets.id, asset.id));
    await audit(ctx.db, {
      clinicId: input.clinicId,
      actorId: input.actorId,
      action: "audio.delete",
      resourceType: "audio_asset",
      resourceId: asset.id,
      metadata: {
        visitId: asset.visitId,
        reason: input.reason,
        cascadeNotes: false,
        cascadeTranscripts: false,
        autoPurge: false,
      },
    });
  }
}

/** Clinic-initiated per-visit delete. Never auto-TTL. Does not cascade notes/transcripts. */
export async function deleteVisitAudio(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; visitId: string },
) {
  const assets = await ctx.db
    .select()
    .from(audioAssets)
    .where(
      and(
        eq(audioAssets.clinicId, input.clinicId),
        eq(audioAssets.visitId, input.visitId),
        isNull(audioAssets.deletedAt),
      ),
    );

  await hardDeleteAssets(ctx, { ...input, assets, reason: "clinic_visit_delete" });

  const remainingNotes = await ctx.db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.clinicId, input.clinicId), eq(notes.visitId, input.visitId)));
  const remainingTranscripts = await ctx.db
    .select({ id: transcripts.id })
    .from(transcripts)
    .where(and(eq(transcripts.clinicId, input.clinicId), eq(transcripts.visitId, input.visitId)));

  return {
    deleted: assets.length,
    notesPreserved: remainingNotes.length,
    transcriptsPreserved: remainingTranscripts.length,
  };
}

/** SEC-007-style clinic / end-of-contract audio delete. No notes/transcripts cascade. */
export async function deleteClinicAudio(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; role: string; confirm: string },
) {
  if (input.role !== "admin") {
    throw forbidden("admin_required", "Clinic-wide audio delete is an admin / end-of-contract path");
  }
  if (input.confirm !== "delete-clinic-audio") {
    throw unprocessable("confirm_required", 'Send { "confirm": "delete-clinic-audio" }');
  }

  const assets = await ctx.db
    .select()
    .from(audioAssets)
    .where(and(eq(audioAssets.clinicId, input.clinicId), isNull(audioAssets.deletedAt)));

  await hardDeleteAssets(ctx, { clinicId: input.clinicId, actorId: input.actorId, assets, reason: "clinic_eoc_delete" });

  return { deleted: assets.length, notesUntouched: true, transcriptsUntouched: true };
}
