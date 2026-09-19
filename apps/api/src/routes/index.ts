import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError, z } from "zod";
import type { AppContext } from "../context.js";
import { actorOf, sendError } from "../context.js";
import { AppError, unauthorized } from "../lib/errors.js";
import { login, publicClinic, publicUser, sessionFromToken } from "../services/auth.js";
import { deleteVisitAudio, ingestAudio } from "../services/audio.js";
import { listChat, patientProfile, postChat, getPatient } from "../services/chat.js";
import { getVisit, recordConsent, recordingGate } from "../services/consent.js";
import { dayPatients, dayPatientsErrorShape, finishDay } from "../services/days.js";
import { resolveFlags } from "../services/flags.js";
import {
  createFollowUp,
  listFollowUps,
  patchFollowUp,
  recordFollowUpEdit,
  sendFollowUp,
  skipFollowUp,
} from "../services/followups.js";
import { getOrCreateNote, patchNote, signNote } from "../services/notes.js";
import { importPatients, stubOpenDentalWriteback } from "../services/pms.js";
import { processQueuedJobs, segmentsAfter, visitTranscript } from "../services/transcript.js";
import { createVisit, endVisit } from "../services/visits.js";
import { patients } from "../db/schema.js";
import { eq } from "drizzle-orm";

const uuid = z.string().uuid();

function bearer(request: FastifyRequest): string {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw unauthorized();
  return header.slice("Bearer ".length).trim();
}

async function requireActor(ctx: AppContext, request: FastifyRequest) {
  const token = bearer(request);
  const { user } = await sessionFromToken(ctx, token);
  (request as FastifyRequest & { actor: unknown }).actor = {
    userId: user.id,
    clinicId: user.clinicId,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

function wrap(
  ctx: AppContext,
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>,
  authed = true,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (authed) await requireActor(ctx, request);
      const result = await handler(request, reply);
      if (result !== undefined && !reply.sent) return result;
    } catch (err) {
      if (err instanceof ZodError) {
        return reply.status(422).send({
          error: "validation_error",
          message: err.message,
          details: err.flatten(),
        });
      }
      return sendError(reply, err instanceof AppError ? err : err);
    }
  };
}

export async function registerRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get("/health", async () => ({
    ok: true,
    residency: ctx.config.residencyRegion,
    flags: resolveFlags(ctx),
  }));

  app.post(
    "/v1/auth/login",
    wrap(
      ctx,
      async (request) => {
        const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(request.body);
        return login(ctx, body.email, body.password);
      },
      false,
    ),
  );

  app.get(
    "/v1/session",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { user, clinic } = await sessionFromToken(ctx, bearer(request));
      return {
        user: publicUser(user),
        clinic: publicClinic(clinic),
        flags: resolveFlags(ctx),
        actor,
      };
    }),
  );

  app.get(
    "/v1/feature-flags",
    wrap(ctx, async () => ({ flags: resolveFlags(ctx) })),
  );

  app.get(
    "/v1/clinic",
    wrap(ctx, async (request) => {
      const { clinic } = await sessionFromToken(ctx, bearer(request));
      return publicClinic(clinic);
    }),
  );

  app.get(
    "/v1/patients",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const rows = await ctx.db.select().from(patients).where(eq(patients.clinicId, actor.clinicId));
      return { patients: rows.map(patientProfile) };
    }),
  );

  app.get(
    "/v1/patients/:id",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      return { patient: patientProfile(await getPatient(ctx, actor.clinicId, id)) };
    }),
  );

  app.get(
    "/v1/patients/:id/profile",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      return { profile: patientProfile(await getPatient(ctx, actor.clinicId, id)) };
    }),
  );

  app.get(
    "/v1/patients/:id/chat",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      return listChat(ctx, actor.clinicId, id);
    }),
  );

  app.post(
    "/v1/patients/:id/chat",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      const body = z.object({ body: z.string().min(1), visitId: uuid.optional() }).parse(request.body);
      return postChat(ctx, {
        clinicId: actor.clinicId,
        actorId: actor.userId,
        patientId: id,
        body: body.body,
        visitId: body.visitId,
      });
    }),
  );

  app.post(
    "/v1/patients/:id/consents",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      const body = z
        .object({
          type: z.enum(["audio_capture", "messaging", "training"]),
          granted: z.boolean(),
          visitId: uuid.optional(),
          messageClass: z.enum(["clinical_transactional", "promotional"]).optional(),
          disclosureScriptId: z.string().optional(),
        })
        .parse(request.body);
      return recordConsent(ctx.db, {
        clinicId: actor.clinicId,
        actorId: actor.userId,
        patientId: id,
        visitId: body.visitId,
        type: body.type,
        messageClass: body.messageClass,
        granted: body.granted,
        disclosureScriptId: body.disclosureScriptId,
      });
    }),
  );

  app.post(
    "/v1/visits",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const body = z.object({ patientId: uuid }).parse(request.body);
      return createVisit(ctx, { clinicId: actor.clinicId, actorId: actor.userId, patientId: body.patientId });
    }),
  );

  app.get(
    "/v1/visits/:id",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      return getVisit(ctx.db, actor.clinicId, id);
    }),
  );

  app.post(
    "/v1/visits/:id/end",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      return endVisit(ctx, { clinicId: actor.clinicId, actorId: actor.userId, visitId: id });
    }),
  );

  app.get(
    "/v1/visits/:id/recording-gate",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      return recordingGate(ctx.db, actor.clinicId, id);
    }),
  );

  app.post(
    "/v1/visits/:id/consent",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      const visit = await getVisit(ctx.db, actor.clinicId, id);
      const body = z
        .object({
          type: z.enum(["audio_capture", "messaging", "training"]).default("audio_capture"),
          granted: z.boolean(),
          messageClass: z.enum(["clinical_transactional", "promotional"]).optional(),
          disclosureScriptId: z.string().optional(),
        })
        .parse(request.body);
      return recordConsent(ctx.db, {
        clinicId: actor.clinicId,
        actorId: actor.userId,
        patientId: visit.patientId,
        visitId: id,
        type: body.type,
        messageClass: body.messageClass,
        granted: body.granted,
        disclosureScriptId: body.disclosureScriptId,
      });
    }),
  );

  app.post(
    "/v1/visits/:id/audio",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      let bytes = Buffer.alloc(0);
      let contentType = "audio/webm";
      const raw = request.body;
      if (Buffer.isBuffer(raw)) {
        bytes = Buffer.from(raw);
        contentType = String(request.headers["content-type"] ?? contentType);
      } else if (raw && typeof raw === "object" && "bytes" in (raw as object)) {
        const parsed = z.object({ bytesBase64: z.string() }).parse(raw);
        bytes = Buffer.from(parsed.bytesBase64, "base64");
      } else {
        bytes = Buffer.from("olive-scaffold-audio");
      }
      return ingestAudio(ctx, {
        clinicId: actor.clinicId,
        actorId: actor.userId,
        visitId: id,
        bytes,
        contentType,
      });
    }),
  );

  app.delete(
    "/v1/visits/:id/audio",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      return deleteVisitAudio(ctx, { clinicId: actor.clinicId, actorId: actor.userId, visitId: id });
    }),
  );

  app.get(
    "/v1/visits/:id/transcript",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      return visitTranscript(ctx, actor.clinicId, id);
    }),
  );

  app.get("/v1/visits/:id/transcript/stream", async (request, reply) => {
    try {
      await requireActor(ctx, request);
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      const query = z.object({ cursor: z.coerce.number().int().nonnegative().optional() }).parse(request.query);
      const cursor = query.cursor ?? 0;

      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      const write = (event: string, data: unknown, eventId?: number) => {
        if (eventId !== undefined) reply.raw.write(`id: ${eventId}\n`);
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const replay = await segmentsAfter(ctx, actor.clinicId, id, cursor);
      for (const segment of replay) {
        write("segment", segment, segment.seq);
      }

      const { job } = await visitTranscript(ctx, actor.clinicId, id);
      write("status", { jobStatus: job?.status ?? "none", cursor: replay.at(-1)?.seq ?? cursor });
      if (job?.status === "completed") {
        write("done", { ok: true });
      }
      reply.raw.end();
    } catch (err) {
      if (reply.raw.headersSent) {
        reply.raw.end();
        return;
      }
      return sendError(reply, err instanceof AppError ? err : err);
    }
  });

  app.get(
    "/v1/visits/:id/note",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      return getOrCreateNote(ctx, actor.clinicId, id);
    }),
  );

  app.patch(
    "/v1/visits/:id/note",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      const body = z.object({ body: z.string() }).parse(request.body);
      return patchNote(ctx, { clinicId: actor.clinicId, actorId: actor.userId, visitId: id, body: body.body });
    }),
  );

  app.post(
    "/v1/visits/:id/note/sign",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      return signNote(ctx, { clinicId: actor.clinicId, actorId: actor.userId, visitId: id });
    }),
  );

  app.get(
    "/v1/visits/:id/follow-ups",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      return { followUps: await listFollowUps(ctx, actor.clinicId, id) };
    }),
  );

  app.post(
    "/v1/visits/:id/follow-ups",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      const body = z
        .object({
          body: z.string().min(1),
          messageClass: z.enum(["clinical_transactional", "promotional"]).optional(),
        })
        .parse(request.body);
      return createFollowUp(ctx, {
        clinicId: actor.clinicId,
        actorId: actor.userId,
        visitId: id,
        body: body.body,
        messageClass: body.messageClass,
      });
    }),
  );

  app.patch(
    "/v1/follow-ups/:id",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      const body = z.object({ body: z.string().min(1) }).parse(request.body);
      return patchFollowUp(ctx, { clinicId: actor.clinicId, actorId: actor.userId, id, body: body.body });
    }),
  );

  app.post(
    "/v1/follow-ups/:id/skip",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      const body = z.object({ reason: z.string().optional() }).parse(request.body ?? {});
      return skipFollowUp(ctx, { clinicId: actor.clinicId, actorId: actor.userId, id, reason: body.reason });
    }),
  );

  app.post(
    "/v1/follow-ups/:id/edits",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      const body = z.object({ before: z.string(), after: z.string() }).parse(request.body);
      return recordFollowUpEdit(ctx, {
        clinicId: actor.clinicId,
        actorId: actor.userId,
        id,
        before: body.before,
        after: body.after,
      });
    }),
  );

  app.post(
    "/v1/follow-ups/:id/send",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const { id } = z.object({ id: uuid }).parse(request.params);
      return sendFollowUp(ctx, { clinicId: actor.clinicId, actorId: actor.userId, id });
    }),
  );

  app.post(
    "/v1/days/finish",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const body = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(request.body);
      return finishDay(ctx, { clinicId: actor.clinicId, actorId: actor.userId, date: body.date });
    }),
  );

  app.get(
    "/v1/days/:date/patients",
    wrap(ctx, async (request, reply) => {
      const actor = actorOf(request);
      const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(request.params);
      try {
        return await dayPatients(ctx, actor.clinicId, date);
      } catch {
        return reply.status(503).send({ ...dayPatientsErrorShape, date });
      }
    }),
  );

  app.post(
    "/v1/pms/import",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const body = z
        .object({
          source: z.string().optional(),
          patients: z
            .array(
              z.object({
                externalId: z.string(),
                firstName: z.string(),
                lastName: z.string(),
                phone: z.string().optional(),
                email: z.string().optional(),
                dateOfBirth: z.string().optional(),
              }),
            )
            .optional(),
        })
        .parse(request.body ?? {});
      return importPatients(ctx, {
        clinicId: actor.clinicId,
        actorId: actor.userId,
        source: body.source,
        patients: body.patients,
      });
    }),
  );

  app.post(
    "/v1/pms/open-dental/writeback",
    wrap(ctx, async (request) => {
      const actor = actorOf(request);
      const body = z.object({ visitId: uuid, noteId: uuid.optional() }).parse(request.body);
      return stubOpenDentalWriteback(ctx, {
        clinicId: actor.clinicId,
        actorId: actor.userId,
        visitId: body.visitId,
        noteId: body.noteId,
      });
    }),
  );

  app.post(
    "/v1/dev/process-jobs",
    wrap(ctx, async () => {
      if (ctx.config.nodeEnv === "production") {
        throw unauthorized();
      }
      const processed = await processQueuedJobs(ctx);
      return { processed };
    }),
  );
}
