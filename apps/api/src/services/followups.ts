import { and, eq } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { clinics, followUpEdits, followUps, notes, patients } from "../db/schema.js";
import { audit } from "../lib/audit.js";
import { forbidden, notFound, unprocessable } from "../lib/errors.js";
import { newId } from "../lib/ids.js";
import { notifySmsCopy } from "../vendors/messaging.js";
import { activeMessagingConsent, hasStopOptOut } from "./consent.js";
import { getVisit } from "./consent.js";

export async function listFollowUps(ctx: AppContext, clinicId: string, visitId: string) {
  return ctx.db
    .select()
    .from(followUps)
    .where(and(eq(followUps.clinicId, clinicId), eq(followUps.visitId, visitId)));
}

export async function createFollowUp(
  ctx: AppContext,
  input: {
    clinicId: string;
    actorId: string;
    visitId: string;
    body: string;
    messageClass?: "clinical_transactional" | "promotional";
  },
) {
  const visit = await getVisit(ctx.db, input.clinicId, input.visitId);
  const [note] = await ctx.db
    .select()
    .from(notes)
    .where(and(eq(notes.clinicId, input.clinicId), eq(notes.visitId, input.visitId)));

  const [row] = await ctx.db
    .insert(followUps)
    .values({
      id: newId(),
      clinicId: input.clinicId,
      visitId: input.visitId,
      patientId: visit.patientId,
      noteId: note?.id ?? null,
      messageClass: input.messageClass ?? "clinical_transactional",
      channel: "secure",
      body: input.body,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  await audit(ctx.db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: "follow_up.create",
    resourceType: "follow_up",
    resourceId: row.id,
  });
  return row;
}

export async function patchFollowUp(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; id: string; body?: string },
) {
  const fu = await getFollowUp(ctx, input.clinicId, input.id);
  if (fu.status === "sent" || fu.status === "skipped") {
    throw forbidden("follow_up_frozen", `Cannot edit a ${fu.status} follow-up`);
  }
  const [updated] = await ctx.db
    .update(followUps)
    .set({ body: input.body ?? fu.body, updatedAt: new Date() })
    .where(eq(followUps.id, fu.id))
    .returning();
  return updated;
}

export async function skipFollowUp(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; id: string; reason?: string },
) {
  const fu = await getFollowUp(ctx, input.clinicId, input.id);
  if (fu.status === "sent") {
    throw forbidden("already_sent", "Cannot skip a sent follow-up");
  }
  const [updated] = await ctx.db
    .update(followUps)
    .set({ status: "skipped", skipReason: input.reason ?? "skipped", updatedAt: new Date() })
    .where(eq(followUps.id, fu.id))
    .returning();
  await audit(ctx.db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: "follow_up.skip",
    resourceType: "follow_up",
    resourceId: fu.id,
  });
  return updated;
}

export async function recordFollowUpEdit(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; id: string; before: string; after: string },
) {
  const fu = await getFollowUp(ctx, input.clinicId, input.id);
  const [event] = await ctx.db
    .insert(followUpEdits)
    .values({
      id: newId(),
      clinicId: input.clinicId,
      followUpId: fu.id,
      before: input.before,
      after: input.after,
      createdBy: input.actorId,
      createdAt: new Date(),
    })
    .returning();
  await ctx.db.update(followUps).set({ body: input.after, updatedAt: new Date() }).where(eq(followUps.id, fu.id));
  await audit(ctx.db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: "follow_up.edit",
    resourceType: "follow_up",
    resourceId: fu.id,
    metadata: { ml: false },
  });
  return event;
}

export async function sendFollowUp(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; id: string },
) {
  const fu = await getFollowUp(ctx, input.clinicId, input.id);
  if (fu.status === "skipped") {
    throw forbidden("follow_up_skipped", "Cannot send a skipped follow-up");
  }
  if (fu.status === "sent") {
    throw forbidden("already_sent", "Follow-up already sent");
  }

  if (fu.noteId) {
    const [note] = await ctx.db.select().from(notes).where(eq(notes.id, fu.noteId));
    if (!note || note.status !== "signed") {
      throw forbidden("unsigned_note", "Never send from an unsigned note");
    }
  }

  const [clinic] = await ctx.db.select().from(clinics).where(eq(clinics.id, input.clinicId));
  if (!clinic?.smsIdentity) {
    throw forbidden("missing_clinic_identity", "Clinic identity is required on notify SMS");
  }

  const stop = await hasStopOptOut(ctx.db, input.clinicId, fu.patientId);
  if (stop) {
    await markFailed(ctx, fu.id, "stop_opt_out");
    await auditSend(ctx, input, fu, "failed", "stop_opt_out");
    throw forbidden("stop_fail_closed", "STOP/unsubscribe honored — notify SMS fail-closed");
  }

  const consent = await activeMessagingConsent(ctx.db, input.clinicId, fu.patientId, fu.messageClass);
  if (!consent) {
    const reason =
      fu.messageClass === "promotional" ? "promotional_fail_closed" : "missing_messaging_consent";
    await markFailed(ctx, fu.id, reason);
    await auditSend(ctx, input, fu, "failed", reason);
    throw forbidden(
      reason,
      fu.messageClass === "promotional"
        ? "Promotional notify SMS fail-closed without per-class consent"
        : "Notify SMS requires an active messaging consent record",
    );
  }

  const [patient] = await ctx.db.select().from(patients).where(eq(patients.id, fu.patientId));
  if (!patient?.phone) {
    throw unprocessable("missing_phone", "Patient phone is required for notify SMS");
  }

  try {
    const secure = await ctx.messaging.createSecureMessage({
      clinicId: input.clinicId,
      patientId: fu.patientId,
      body: fu.body,
    });
    const magicLinkToken = newId();
    const magicLink = `/v1/inbox/${magicLinkToken}`;
    const notify = await ctx.messaging.sendNotifySms({
      to: patient.phone,
      clinicIdentity: clinic.smsIdentity,
      messageClass: fu.messageClass,
      magicLink,
      body: notifySmsCopy(clinic.smsIdentity, magicLink),
    });
    const [updated] = await ctx.db
      .update(followUps)
      .set({
        status: "sent",
        channel: "secure",
        secureMessageId: secure.secureMessageId,
        notifySmsId: notify.vendorMessageId,
        magicLinkToken,
        sentAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(followUps.id, fu.id))
      .returning();
    await auditSend(ctx, input, fu, "sent", undefined, notify.vendorMessageId, secure.secureMessageId);
    return {
      ...updated,
      channelOfRecord: "secure" as const,
      notifySms: { stub: true, vendorMessageId: notify.vendorMessageId, containsPhi: false },
      inboxPath: magicLink,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "send_failed";
    await markFailed(ctx, fu.id, message);
    await auditSend(ctx, input, fu, "failed", message);
    throw err;
  }
}

export async function inboxByToken(ctx: AppContext, token: string) {
  const [fu] = await ctx.db.select().from(followUps).where(eq(followUps.magicLinkToken, token));
  if (!fu) throw notFound("inbox");
  return {
    channelOfRecord: "secure" as const,
    secureMessageId: fu.secureMessageId,
    body: fu.body,
    clinicId: fu.clinicId,
    stub: true,
  };
}

async function getFollowUp(ctx: AppContext, clinicId: string, id: string) {
  const [fu] = await ctx.db
    .select()
    .from(followUps)
    .where(and(eq(followUps.id, id), eq(followUps.clinicId, clinicId)));
  if (!fu) throw notFound("follow-up");
  return fu;
}

async function markFailed(ctx: AppContext, id: string, error: string) {
  await ctx.db
    .update(followUps)
    .set({ status: "failed", lastError: error, updatedAt: new Date() })
    .where(eq(followUps.id, id));
}

async function auditSend(
  ctx: AppContext,
  input: { clinicId: string; actorId: string; id: string },
  fu: { id: string; messageClass: string },
  outcome: "sent" | "failed",
  reason?: string,
  vendorMessageId?: string,
  secureMessageId?: string,
) {
  await audit(ctx.db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: outcome === "sent" ? "follow_up.send" : "follow_up.send_failed",
    resourceType: "follow_up",
    resourceId: fu.id,
    metadata: {
      messageClass: fu.messageClass,
      reason,
      vendorMessageId,
      secureMessageId,
      channelOfRecord: "secure",
      notifySmsNoPhi: true,
    },
  });
}
