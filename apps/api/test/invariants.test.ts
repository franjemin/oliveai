import { afterEach, describe, expect, it } from "vitest";
import { DEMO } from "../src/lib/ids.js";
import { AppError } from "../src/lib/errors.js";
import { ingestAudio } from "../src/services/audio.js";
import { recordConsent } from "../src/services/consent.js";
import { createFollowUp, sendFollowUp } from "../src/services/followups.js";
import { patchNote, signNote } from "../src/services/notes.js";
import { processQueuedJobs } from "../src/services/transcript.js";
import { notes, transcripts } from "../src/db/schema.js";
import { and, eq } from "drizzle-orm";
import { auth, createTestKit, type TestKit } from "./helpers.js";

let kit: TestKit | undefined;

afterEach(async () => {
  if (kit) await kit.close();
  kit = undefined;
});

describe("Olive v1 privacy invariants", () => {
  it("refuses audio ingest without visit-scoped audio_capture consent", async () => {
    kit = await createTestKit();
    const gate = await kit.app.inject({
      method: "GET",
      url: `/v1/visits/${DEMO.visitAlexId}/recording-gate`,
      headers: auth(kit.token),
    });
    expect(gate.statusCode).toBe(200);
    expect(gate.json()).toMatchObject({ allowed: false, reason: "missing_audio_capture_consent" });

    const audio = await kit.app.inject({
      method: "POST",
      url: `/v1/visits/${DEMO.visitAlexId}/audio`,
      headers: auth(kit.token),
      payload: { bytesBase64: Buffer.from("nope").toString("base64") },
    });
    expect(audio.statusCode).toBe(403);
    expect(audio.json()).toMatchObject({ error: "recording_gate_denied" });
  });

  it("cannot edit a signed note", async () => {
    kit = await createTestKit();
    await kit.app.inject({
      method: "PATCH",
      url: `/v1/visits/${DEMO.visitAlexId}/note`,
      headers: auth(kit.token),
      payload: { body: "Draft exam note" },
    });
    const signed = await kit.app.inject({
      method: "POST",
      url: `/v1/visits/${DEMO.visitAlexId}/note/sign`,
      headers: auth(kit.token),
    });
    expect(signed.statusCode).toBe(200);
    expect(signed.json()).toMatchObject({ status: "signed" });

    const edit = await kit.app.inject({
      method: "PATCH",
      url: `/v1/visits/${DEMO.visitAlexId}/note`,
      headers: auth(kit.token),
      payload: { body: "tamper" },
    });
    expect(edit.statusCode).toBe(403);
    expect(edit.json()).toMatchObject({ error: "note_signed_immutable" });
  });

  it("SMS fails without messaging consent and promotional is fail-closed", async () => {
    kit = await createTestKit();
    await signNote(kit.ctx, {
      clinicId: DEMO.clinicId,
      actorId: DEMO.userId,
      visitId: DEMO.visitAlexId,
    });

    const noConsent = await createFollowUp(kit.ctx, {
      clinicId: DEMO.clinicId,
      actorId: DEMO.userId,
      visitId: DEMO.visitAlexId,
      body: "See you next week",
      messageClass: "clinical_transactional",
    });
    // Revoke by creating a follow-up for Sam (no messaging consent)
    const samVisit = await kit.app.inject({
      method: "POST",
      url: "/v1/visits",
      headers: auth(kit.token),
      payload: { patientId: DEMO.patientSamId },
    });
    const samVisitId = (samVisit.json() as { id: string }).id;
    await patchNote(kit.ctx, {
      clinicId: DEMO.clinicId,
      actorId: DEMO.userId,
      visitId: samVisitId,
      body: "Sam note",
    });
    await signNote(kit.ctx, { clinicId: DEMO.clinicId, actorId: DEMO.userId, visitId: samVisitId });
    const samFu = await createFollowUp(kit.ctx, {
      clinicId: DEMO.clinicId,
      actorId: DEMO.userId,
      visitId: samVisitId,
      body: "Please book hygiene",
      messageClass: "clinical_transactional",
    });

    await expect(
      sendFollowUp(kit.ctx, { clinicId: DEMO.clinicId, actorId: DEMO.userId, id: samFu.id }),
    ).rejects.toMatchObject({ code: "missing_messaging_consent", statusCode: 403 });

    const promo = await createFollowUp(kit.ctx, {
      clinicId: DEMO.clinicId,
      actorId: DEMO.userId,
      visitId: DEMO.visitAlexId,
      body: "Whitening special this month",
      messageClass: "promotional",
    });
    await expect(
      sendFollowUp(kit.ctx, { clinicId: DEMO.clinicId, actorId: DEMO.userId, id: promo.id }),
    ).rejects.toMatchObject({ code: "promotional_fail_closed", statusCode: 403 });

    // Alex has clinical_transactional consent from seed — send should succeed after sign
    await sendFollowUp(kit.ctx, { clinicId: DEMO.clinicId, actorId: DEMO.userId, id: noConsent.id });
  });

  it("never cascade-deletes notes or transcripts when audio is deleted", async () => {
    kit = await createTestKit();
    await recordConsent(kit.ctx.db, {
      clinicId: DEMO.clinicId,
      actorId: DEMO.userId,
      patientId: DEMO.patientAlexId,
      visitId: DEMO.visitAlexId,
      type: "audio_capture",
      granted: true,
      disclosureScriptId: DEMO.audioDisclosureScriptId,
    });
    await ingestAudio(kit.ctx, {
      clinicId: DEMO.clinicId,
      actorId: DEMO.userId,
      visitId: DEMO.visitAlexId,
      bytes: Buffer.from("audio-bytes"),
    });
    await processQueuedJobs(kit.ctx);
    await patchNote(kit.ctx, {
      clinicId: DEMO.clinicId,
      actorId: DEMO.userId,
      visitId: DEMO.visitAlexId,
      body: "Keep me",
    });

    const del = await kit.app.inject({
      method: "DELETE",
      url: `/v1/visits/${DEMO.visitAlexId}/audio`,
      headers: auth(kit.token),
    });
    expect(del.statusCode).toBe(200);
    expect(del.json()).toMatchObject({ notesPreserved: 1, transcriptsPreserved: 1 });

    const noteRows = await kit.ctx.db
      .select()
      .from(notes)
      .where(and(eq(notes.clinicId, DEMO.clinicId), eq(notes.visitId, DEMO.visitAlexId)));
    const txRows = await kit.ctx.db
      .select()
      .from(transcripts)
      .where(and(eq(transcripts.clinicId, DEMO.clinicId), eq(transcripts.visitId, DEMO.visitAlexId)));
    expect(noteRows).toHaveLength(1);
    expect(txRows).toHaveLength(1);
  });

  it("session bootstrap exposes flags defaulting off, including training", async () => {
    kit = await createTestKit();
    const session = await kit.app.inject({
      method: "GET",
      url: "/v1/session",
      headers: auth(kit.token),
    });
    expect(session.json()).toMatchObject({
      user: { role: "dentist", tenantId: DEMO.clinicId, clinicId: DEMO.clinicId },
      clinic: { tenantId: DEMO.clinicId },
      flags: {
        aftercare: false,
        claimsGuard: false,
        phiTrainingAllowed: false,
        odWriteback: false,
        quebecLaw25: false,
      },
    });
  });

  it("OD write-back is 501 flagged unimplemented", async () => {
    kit = await createTestKit();
    const res = await kit.app.inject({
      method: "POST",
      url: "/v1/pms/open-dental/writeback",
      headers: auth(kit.token),
      payload: { visitId: DEMO.visitAlexId },
    });
    expect(res.statusCode).toBe(501);
    expect(res.json()).toMatchObject({
      error: "od_writeback_stubbed",
      details: { flagged: true, flag: "odWriteback" },
    });
  });

  it("unsigned notes cannot send follow-ups", async () => {
    kit = await createTestKit();
    await kit.app.inject({
      method: "PATCH",
      url: `/v1/visits/${DEMO.visitAlexId}/note`,
      headers: auth(kit.token),
      payload: { body: "still a draft" },
    });
    const created = await kit.app.inject({
      method: "POST",
      url: `/v1/visits/${DEMO.visitAlexId}/follow-ups`,
      headers: auth(kit.token),
      payload: { body: "Thanks for coming in" },
    });
    const id = (created.json() as { id: string }).id;
    const send = await kit.app.inject({
      method: "POST",
      url: `/v1/follow-ups/${id}/send`,
      headers: auth(kit.token),
    });
    expect(send.statusCode).toBe(403);
    expect(send.json()).toMatchObject({ error: "unsigned_note" });
  });

  it("AppError helper stays typed for fail-closed messaging", () => {
    const err = new AppError(403, "promotional_fail_closed", "no");
    expect(err.statusCode).toBe(403);
  });
});
