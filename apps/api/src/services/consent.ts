import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { consents, messagingOptOuts, visits } from "../db/schema.js";
import { audit } from "../lib/audit.js";
import { forbidden, notFound, unprocessable } from "../lib/errors.js";
import { newId } from "../lib/ids.js";

export type RecordingGate = {
  allowed: boolean;
  reason?: string;
  disclosureScriptId?: string;
};

export async function getVisit(db: Db, clinicId: string, visitId: string) {
  const [visit] = await db
    .select()
    .from(visits)
    .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)));
  if (!visit) throw notFound("visit");
  return visit;
}

export async function activeAudioConsent(db: Db, clinicId: string, visitId: string) {
  const [row] = await db
    .select()
    .from(consents)
    .where(
      and(
        eq(consents.clinicId, clinicId),
        eq(consents.visitId, visitId),
        eq(consents.type, "audio_capture"),
        eq(consents.granted, true),
        isNull(consents.revokedAt),
      ),
    )
    .orderBy(desc(consents.createdAt))
    .limit(1);
  return row ?? null;
}

export async function listVisitConsents(db: Db, clinicId: string, visitId: string) {
  await getVisit(db, clinicId, visitId);
  return db
    .select()
    .from(consents)
    .where(and(eq(consents.clinicId, clinicId), eq(consents.visitId, visitId)))
    .orderBy(desc(consents.createdAt));
}

export async function recordingGate(db: Db, clinicId: string, visitId: string): Promise<RecordingGate> {
  await getVisit(db, clinicId, visitId);
  const consent = await activeAudioConsent(db, clinicId, visitId);
  if (!consent) {
    return { allowed: false, reason: "missing_audio_capture_consent" };
  }
  if (!consent.disclosureScriptId) {
    return { allowed: false, reason: "missing_disclosure_script_id" };
  }
  return { allowed: true, disclosureScriptId: consent.disclosureScriptId };
}

export async function recordConsent(
  db: Db,
  input: {
    clinicId: string;
    actorId: string;
    patientId: string;
    visitId?: string | null;
    type: "audio_capture" | "messaging" | "training";
    messageClass?: "clinical_transactional" | "promotional" | null;
    granted: boolean;
    disclosureScriptId?: string | null;
  },
) {
  if (input.type === "audio_capture") {
    if (!input.visitId) {
      throw unprocessable("visit_required", "audio_capture consent is visit-scoped");
    }
    if (input.granted && !input.disclosureScriptId) {
      throw unprocessable("disclosure_required", "versioned disclosure/script id is required");
    }
    await getVisit(db, input.clinicId, input.visitId);
  }

  if (input.type === "messaging" && input.granted && !input.messageClass) {
    throw unprocessable("message_class_required", "messaging consent requires a message_class");
  }

  if (input.type === "training" && input.granted) {
    // Express patient consent fields are required later; contract-only is not enough.
    // v1 stores the grant only when an explicit disclosure script is present.
    if (!input.disclosureScriptId) {
      throw unprocessable(
        "express_training_consent_required",
        "PHI training requires express patient consent (not contract-only)",
      );
    }
  }

  const now = new Date();
  const id = newId();
  const [row] = await db
    .insert(consents)
    .values({
      id,
      clinicId: input.clinicId,
      patientId: input.patientId,
      visitId: input.visitId ?? null,
      type: input.type,
      messageClass: input.messageClass ?? null,
      granted: input.granted,
      disclosureScriptId: input.disclosureScriptId ?? null,
      grantedAt: input.granted ? now : null,
      createdBy: input.actorId,
      createdAt: now,
    })
    .returning();

  await audit(db, {
    clinicId: input.clinicId,
    actorId: input.actorId,
    action: input.granted ? "consent.grant" : "consent.deny",
    resourceType: "consent",
    resourceId: id,
    metadata: { type: input.type, messageClass: input.messageClass, visitId: input.visitId },
  });

  return row;
}

export async function activeMessagingConsent(
  db: Db,
  clinicId: string,
  patientId: string,
  messageClass: "clinical_transactional" | "promotional",
) {
  const [row] = await db
    .select()
    .from(consents)
    .where(
      and(
        eq(consents.clinicId, clinicId),
        eq(consents.patientId, patientId),
        eq(consents.type, "messaging"),
        eq(consents.messageClass, messageClass),
        eq(consents.granted, true),
        isNull(consents.revokedAt),
      ),
    )
    .orderBy(desc(consents.createdAt))
    .limit(1);
  return row ?? null;
}

export async function hasStopOptOut(db: Db, clinicId: string, patientId: string) {
  const rows = await db
    .select()
    .from(messagingOptOuts)
    .where(and(eq(messagingOptOuts.clinicId, clinicId), eq(messagingOptOuts.patientId, patientId)));
  return rows[0] ?? null;
}

export async function recordStop(
  db: Db,
  input: { clinicId: string; patientId: string; keyword?: string },
) {
  const [row] = await db
    .insert(messagingOptOuts)
    .values({
      id: newId(),
      clinicId: input.clinicId,
      patientId: input.patientId,
      keyword: input.keyword ?? "STOP",
      optedOutAt: new Date(),
      createdAt: new Date(),
    })
    .returning();
  await audit(db, {
    clinicId: input.clinicId,
    action: "messaging.stop",
    resourceType: "patient",
    resourceId: input.patientId,
  });
  return row;
}

export function assertPromotionalFailClosed(
  messageClass: "clinical_transactional" | "promotional",
  hasConsent: boolean,
) {
  if (messageClass === "promotional" && !hasConsent) {
    throw forbidden("promotional_fail_closed", "Promotional messaging requires active per-class consent");
  }
}
