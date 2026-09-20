import { and, eq, gt } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { transcriptionJobs, transcripts, transcriptSegments, visitSpeakers } from "../db/schema.js";
import { audit } from "../lib/audit.js";
import { newId } from "../lib/ids.js";
import { longRetentionUntil } from "../lib/retention.js";

export async function enqueueTranscription(
  ctx: AppContext,
  input: { clinicId: string; visitId: string; audioAssetId: string },
) {
  const [job] = await ctx.db
    .insert(transcriptionJobs)
    .values({
      id: newId(),
      clinicId: input.clinicId,
      visitId: input.visitId,
      audioAssetId: input.audioAssetId,
      status: "queued",
      vendor: ctx.transcription.name,
      createdAt: new Date(),
    })
    .returning();
  await audit(ctx.db, {
    clinicId: input.clinicId,
    action: "transcript.enqueue",
    resourceType: "transcription_job",
    resourceId: job.id,
    metadata: { visitId: input.visitId },
  });
  return job;
}

export async function processQueuedJobs(ctx: AppContext): Promise<number> {
  const queued = await ctx.db
    .select()
    .from(transcriptionJobs)
    .where(eq(transcriptionJobs.status, "queued"));

  for (const job of queued) {
    await processJob(ctx, job.id);
  }
  return queued.length;
}

export async function processJob(ctx: AppContext, jobId: string) {
  const [job] = await ctx.db.select().from(transcriptionJobs).where(eq(transcriptionJobs.id, jobId));
  if (!job || job.status !== "queued") return null;

  await ctx.db
    .update(transcriptionJobs)
    .set({ status: "processing", startedAt: new Date() })
    .where(eq(transcriptionJobs.id, jobId));

  try {
    const utterances = await ctx.transcription.transcribe({
      visitId: job.visitId,
      objectKey: job.audioAssetId,
    });

    const now = new Date();
    const transcriptId = newId();
    await ctx.db.insert(transcripts).values({
      id: transcriptId,
      clinicId: job.clinicId,
      visitId: job.visitId,
      jobId: job.id,
      retentionUntil: longRetentionUntil(now, ctx.config.noteTranscriptRetentionYears),
      createdAt: now,
    });

    let seq = 0;
    for (const u of utterances) {
      seq += 1;
      const existingSpeaker = await ctx.db
        .select()
        .from(visitSpeakers)
        .where(
          and(eq(visitSpeakers.visitId, job.visitId), eq(visitSpeakers.speakerLabel, u.speakerLabel)),
        );
      if (!existingSpeaker[0]) {
        await ctx.db.insert(visitSpeakers).values({
          id: newId(),
          clinicId: job.clinicId,
          visitId: job.visitId,
          speakerLabel: u.speakerLabel,
          roleHint: u.roleHint,
          createdAt: now,
        });
      }

      await ctx.db.insert(transcriptSegments).values({
        id: newId(),
        clinicId: job.clinicId,
        visitId: job.visitId,
        transcriptId,
        seq,
        speakerLabel: u.speakerLabel,
        text: u.text,
        startMs: u.startMs,
        endMs: u.endMs,
        createdAt: now,
      });
    }

    await ctx.db
      .update(transcriptionJobs)
      .set({ status: "completed", completedAt: now })
      .where(eq(transcriptionJobs.id, jobId));

    await audit(ctx.db, {
      clinicId: job.clinicId,
      action: "transcript.generate",
      resourceType: "transcript",
      resourceId: transcriptId,
      metadata: { visitId: job.visitId, jobId: job.id, segments: seq },
    });

    return transcriptId;
  } catch (err) {
    await ctx.db
      .update(transcriptionJobs)
      .set({ status: "failed", error: err instanceof Error ? err.message : "transcribe_failed" })
      .where(eq(transcriptionJobs.id, jobId));
    throw err;
  }
}

export async function segmentsAfter(ctx: AppContext, clinicId: string, visitId: string, cursor: number) {
  return ctx.db
    .select()
    .from(transcriptSegments)
    .where(
      and(
        eq(transcriptSegments.clinicId, clinicId),
        eq(transcriptSegments.visitId, visitId),
        gt(transcriptSegments.seq, cursor),
      ),
    )
    .orderBy(transcriptSegments.seq);
}

export async function visitTranscript(ctx: AppContext, clinicId: string, visitId: string) {
  const [transcript] = await ctx.db
    .select()
    .from(transcripts)
    .where(and(eq(transcripts.clinicId, clinicId), eq(transcripts.visitId, visitId)));
  const segments = await ctx.db
    .select()
    .from(transcriptSegments)
    .where(and(eq(transcriptSegments.clinicId, clinicId), eq(transcriptSegments.visitId, visitId)))
    .orderBy(transcriptSegments.seq);
  const [job] = await ctx.db
    .select()
    .from(transcriptionJobs)
    .where(and(eq(transcriptionJobs.clinicId, clinicId), eq(transcriptionJobs.visitId, visitId)));
  return { transcript: transcript ?? null, segments, job: job ?? null };
}
