import { and, eq, isNull, lte } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { audioAssets, notes, transcriptSegments, transcripts, visits } from "../db/schema.js";
import { audit } from "../lib/audit.js";
import { forbidden, notFound } from "../lib/errors.js";
import { newId } from "../lib/ids.js";
import { audioDeleteAfter } from "../lib/retention.js";
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

  const deleteAfter = visit.endedAt
    ? audioDeleteAfter(visit.endedAt, ctx.config.audioRetentionHours)
    : null;

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
      deleteAfter,
      createdAt: new Date(),
    })
    .returning();

  await audit(ctx.db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: "audio.ingest",
    resourceType: "audio_asset",
    resourceId: id,
    metadata: { visitId: input.visitId, disclosureScriptId: gate.disclosureScriptId },
  });

  const job = await enqueueTranscription(ctx, {
    clinicId: input.clinicId,
    visitId: input.visitId,
    audioAssetId: id,
  });

  return { asset, job };
}

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

  for (const asset of assets) {
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
      metadata: { visitId: input.visitId, cascadeNotes: false, cascadeTranscripts: false },
    });
  }

  // Invariant: never cascade-delete notes or transcripts with audio.
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

export async function sweepExpiredAudio(ctx: AppContext): Promise<number> {
  const now = new Date();
  const expired = await ctx.db
    .select()
    .from(audioAssets)
    .where(and(isNull(audioAssets.deletedAt), lte(audioAssets.deleteAfter, now)));

  for (const asset of expired) {
    await ctx.storage.delete(asset.objectKey);
    await ctx.db.update(audioAssets).set({ deletedAt: now }).where(eq(audioAssets.id, asset.id));
    await audit(ctx.db, {
      clinicId: asset.clinicId,
      action: "audio.retention_delete",
      resourceType: "audio_asset",
      resourceId: asset.id,
      metadata: {
        visitId: asset.visitId,
        deleteAfter: asset.deleteAfter,
        notesUntouched: true,
        transcriptsUntouched: true,
      },
    });
  }
  return expired.length;
}

export async function applyAudioTtlOnVisitEnd(
  ctx: AppContext,
  clinicId: string,
  visitId: string,
  endedAt: Date,
) {
  const deleteAfter = audioDeleteAfter(endedAt, ctx.config.audioRetentionHours);
  await ctx.db
    .update(audioAssets)
    .set({ deleteAfter })
    .where(
      and(eq(audioAssets.clinicId, clinicId), eq(audioAssets.visitId, visitId), isNull(audioAssets.deletedAt)),
    );
}
