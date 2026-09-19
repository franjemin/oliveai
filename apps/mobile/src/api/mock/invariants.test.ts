import assert from "node:assert/strict";
import { test } from "node:test";

import { startAmbientCapture } from "../recordingGate";
import { ApiError, DEMO } from "../types";
import { CORE_WALKTHROUGH } from "../walkthrough";
import { mockApi } from "./client";
import { resetState } from "./store";

test("Core walkthrough logs in and loads seeded visit 005", async () => {
  resetState();
  const session = await mockApi.login(CORE_WALKTHROUGH.loginEmail, CORE_WALKTHROUGH.loginPassword);
  assert.equal(session.user.email, CORE_WALKTHROUGH.loginEmail);
  assert.equal(session.user.role, "dentist");
  const visit = await mockApi.getVisit(CORE_WALKTHROUGH.visitId);
  assert.equal(visit.id, CORE_WALKTHROUGH.visitId);
  assert.equal(visit.patientId, CORE_WALKTHROUGH.patientId);
  assert.equal(visit.status, "in_progress");
});

test("OLI-9 refuse keeps recording-gate closed and never starts capture", async () => {
  resetState();
  await mockApi.recordVisitConsent(DEMO.visitAlexId, {
    type: "audio_capture",
    granted: false,
    visitId: DEMO.visitAlexId,
    disclosureScriptId: "audio-disclosure-v1",
  });
  const gate = await mockApi.recordingGate(DEMO.visitAlexId);
  assert.equal(gate.allowed, false);
  await assert.rejects(() => startAmbientCapture(mockApi, DEMO.visitAlexId), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.error, "recording_gate_denied");
    return true;
  });
});

test("OLI-9 accept stores disclosure id then opens the gate", async () => {
  resetState();
  const consent = await mockApi.recordVisitConsent(DEMO.visitAlexId, {
    type: "audio_capture",
    granted: true,
    visitId: DEMO.visitAlexId,
    disclosureScriptId: "audio-disclosure-v1",
  });
  assert.equal(consent.disclosureScriptId, "audio-disclosure-v1");
  const gate = await mockApi.recordingGate(DEMO.visitAlexId);
  assert.equal(gate.allowed, true);
  if (gate.allowed) assert.equal(gate.disclosureScriptId, "audio-disclosure-v1");
  const capture = await startAmbientCapture(mockApi, DEMO.visitAlexId);
  assert.equal(capture.disclosureScriptId, "audio-disclosure-v1");
});

test("OLI-5 signed notes are immutable and Sign is draft-only", async () => {
  resetState();
  await mockApi.recordVisitConsent(DEMO.visitAlexId, {
    type: "audio_capture",
    granted: true,
    visitId: DEMO.visitAlexId,
    disclosureScriptId: "audio-disclosure-v1",
  });
  await mockApi.endVisit(DEMO.visitAlexId);
  const draft = await mockApi.getNote(DEMO.visitAlexId);
  assert.equal(draft.status, "draft");
  const signed = await mockApi.signNote(DEMO.visitAlexId);
  assert.equal(signed.status, "signed");
  await assert.rejects(() => mockApi.patchNote(DEMO.visitAlexId, "silent mutate"), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.error, "note_signed_immutable");
    return true;
  });
  await assert.rejects(() => mockApi.signNote(DEMO.visitAlexId), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.error, "already_signed");
    return true;
  });
});

test("OLI-16 mock send returns STOP and CASL consent rejects", async () => {
  resetState();
  const samVisit = await mockApi.createVisit(DEMO.patientSamId);
  await mockApi.recordVisitConsent(samVisit.id, {
    type: "audio_capture",
    granted: true,
    visitId: samVisit.id,
    disclosureScriptId: "audio-disclosure-v1",
  });
  await mockApi.endVisit(samVisit.id);
  await mockApi.signNote(samVisit.id);
  const [samFu] = await mockApi.listFollowUps(samVisit.id);
  await assert.rejects(() => mockApi.sendFollowUp(samFu.id), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.error, "missing_messaging_consent");
    return true;
  });

  const jordanVisit = await mockApi.createVisit(DEMO.patientJordanId);
  await mockApi.recordVisitConsent(jordanVisit.id, {
    type: "audio_capture",
    granted: true,
    visitId: jordanVisit.id,
    disclosureScriptId: "audio-disclosure-v1",
  });
  await mockApi.endVisit(jordanVisit.id);
  await mockApi.signNote(jordanVisit.id);
  const [jordanFu] = await mockApi.listFollowUps(jordanVisit.id);
  await assert.rejects(() => mockApi.sendFollowUp(jordanFu.id), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.error, "stop_fail_closed");
    return true;
  });
});

test("send publishes channel=secure and a contract inbox payload", async () => {
  resetState();
  await mockApi.recordVisitConsent(DEMO.visitAlexId, {
    type: "audio_capture",
    granted: true,
    visitId: DEMO.visitAlexId,
    disclosureScriptId: "audio-disclosure-v1",
  });
  await mockApi.endVisit(DEMO.visitAlexId);
  await mockApi.signNote(DEMO.visitAlexId);
  const [fu] = await mockApi.listFollowUps(DEMO.visitAlexId);
  const sent = await mockApi.sendFollowUp(fu.id);
  assert.equal(sent.channel, "secure");
  assert.equal(sent.channelOfRecord, "secure");
  assert.equal(sent.notifySms?.containsPhi, false);
  assert.ok(sent.magicLinkToken);
  assert.ok(sent.inboxPath?.includes(sent.magicLinkToken ?? ""));
  const inbox = await mockApi.getInbox(sent.magicLinkToken as string);
  assert.equal(inbox.channelOfRecord, "secure");
  assert.equal(inbox.body, sent.body);
  const closed = await mockApi.finishDay(DEMO.date);
  assert.equal(typeof closed.pendingCount, "number");
});
