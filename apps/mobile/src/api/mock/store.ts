import { notifyStubBody } from "../../copy/messaging";
import {
  ApiError,
  DEMO,
  type ChatMessage,
  type ChatThreadView,
  type Consent,
  type DayPatient,
  type FollowUp,
  type FollowUpEdit,
  type FollowUpSendResult,
  type LearningEvent,
  type MagicInbox,
  type Note,
  type NotifyStub,
  type StoredLearningEvent,
  type TranscriptSegment,
  type Visit,
} from "../types";
import { appendLearningEvent, applyStyle, styleHeuristicFromEvents } from "../learning";
import { DISCLOSURE_SCRIPT_ID } from "./seed";
import {
  TODAY,
  clinic,
  dayRoster,
  flags,
  followUpForPatient,
  initialConsents,
  initialVisits,
  noteForPatient,
  patients,
  user,
  alexSegments,
} from "./seed";

function nowIso(): string {
  return new Date().toISOString();
}

function nid(prefix: string): string {
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

function yearsFromNow(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString();
}

export type MockState = {
  visits: Visit[];
  consents: Consent[];
  notes: Note[];
  followUps: FollowUp[];
  day: DayPatient[];
  segmentsByVisit: Record<string, TranscriptSegment[]>;
  stoppedPatientIds: Set<string>;
  dayFinished: boolean;
  threads: ChatThreadView[];
  notifies: NotifyStub[];
  inboxTokens: Record<string, string>;
  learningEvents: StoredLearningEvent[];
};

export function createInitialState(): MockState {
  const now = nowIso();
  return {
    visits: initialVisits(now),
    consents: initialConsents(now),
    notes: [],
    followUps: [],
    day: dayRoster.map((row) => ({ ...row })),
    segmentsByVisit: {},
    stoppedPatientIds: new Set([DEMO.patientJordanId]),
    dayFinished: false,
    threads: [],
    notifies: [],
    inboxTokens: {},
    learningEvents: [],
  };
}

let state = createInitialState();

export function getState(): MockState {
  return state;
}

export function resetState(): void {
  state = createInitialState();
}

export function getClinic() {
  return clinic;
}

export function getUser() {
  return user;
}

export function getFlags() {
  return flags;
}

export function getToday() {
  return TODAY;
}

export function listPatients() {
  return patients;
}

export function getPatient(id: string) {
  const p = patients.find((row) => row.id === id);
  if (!p) throw new ApiError({ error: "not_found", message: "patient" });
  return p;
}

export function getVisit(id: string) {
  const v = state.visits.find((row) => row.id === id);
  if (!v) throw new ApiError({ error: "not_found", message: "visit" });
  return v;
}

export function dayFeed() {
  return { date: TODAY, patients: state.day };
}

function syncDayVisit(visit: Visit, recording: DayPatient["recording"]) {
  state.day = state.day.map((row) =>
    row.patientId === visit.patientId
      ? {
          ...row,
          visitId: visit.id,
          visitStatus: visit.status === "completed" ? "completed" : "in_progress",
          recording,
        }
      : row,
  );
}

export function createVisit(patientId: string): Visit {
  getPatient(patientId);
  const existing = state.visits.find((v) => v.patientId === patientId && v.status === "in_progress");
  if (existing) return existing;
  const visit: Visit = {
    id: nid("visit"),
    clinicId: DEMO.clinicId,
    patientId,
    providerId: DEMO.userId,
    status: "in_progress",
    startedAt: nowIso(),
    endedAt: null,
  };
  state.visits = [...state.visits, visit];
  syncDayVisit(visit, "pending_consent");
  return visit;
}

export function recordingGate(visitId: string) {
  getVisit(visitId);
  const consent = [...state.consents]
    .reverse()
    .find(
      (c) =>
        c.visitId === visitId &&
        c.type === "audio_capture" &&
        c.granted &&
        !c.revokedAt,
    );
  if (!consent) {
    return { allowed: false as const, reason: "missing_audio_capture_consent" };
  }
  if (!consent.disclosureScriptId) {
    return { allowed: false as const, reason: "missing_disclosure_script_id" };
  }
  return { allowed: true as const, disclosureScriptId: consent.disclosureScriptId };
}

export function recordVisitConsent(
  visitId: string,
  input: {
    type: Consent["type"];
    granted: boolean;
    disclosureScriptId?: string;
    messageClass?: Consent["messageClass"];
    channel?: Consent["channel"];
    obtainedFrom?: Consent["obtainedFrom"];
  },
): Consent {
  const visit = getVisit(visitId);
  if (input.type === "audio_capture" && input.granted && !input.disclosureScriptId) {
    throw new ApiError({
      error: "disclosure_required",
      message: "versioned disclosure/script id is required",
    });
  }
  const row: Consent = {
    id: nid("consent"),
    clinicId: DEMO.clinicId,
    patientId: visit.patientId,
    visitId,
    type: input.type,
    messageClass: input.messageClass ?? null,
    granted: input.granted,
    disclosureScriptId: input.disclosureScriptId ?? (input.type === "audio_capture" ? DISCLOSURE_SCRIPT_ID : null),
    grantedAt: input.granted ? nowIso() : null,
    revokedAt: null,
    createdBy: DEMO.userId,
    createdAt: nowIso(),
    channel: input.channel ?? "in_app",
    obtainedFrom: input.obtainedFrom ?? "patient",
  };
  state.consents = [...state.consents, row];
  if (input.type === "audio_capture") {
    syncDayVisit(visit, input.granted ? "live" : "declined");
  }
  return row;
}

export function attachLiveTranscript(visitId: string) {
  if (!state.segmentsByVisit[visitId]) {
    state.segmentsByVisit[visitId] = alexSegments.map((s) => ({ ...s, id: nid("seg") }));
  }
}

export function getTranscript(visitId: string) {
  getVisit(visitId);
  const declined = latestAudioConsent(visitId)?.granted === false;
  const segs = declined ? [] : (state.segmentsByVisit[visitId] ?? []);
  return {
    transcript: segs.length
      ? { id: `tr-${visitId}`, visitId, retentionUntil: yearsFromNow(10) }
      : null,
    segments: segs,
    job: segs.length
      ? { id: `job-${visitId}`, visitId, status: "completed" as const, vendor: "stub" }
      : { id: `job-${visitId}`, visitId, status: "queued" as const, vendor: "stub" },
  };
}

function latestAudioConsent(visitId: string) {
  return [...state.consents]
    .reverse()
    .find((c) => c.visitId === visitId && c.type === "audio_capture");
}

export function endVisit(visitId: string): Visit {
  const visit = getVisit(visitId);
  const ended: Visit = {
    ...visit,
    status: "completed",
    endedAt: nowIso(),
  };
  state.visits = state.visits.map((v) => (v.id === visitId ? ended : v));
  const audio = latestAudioConsent(visitId);
  const declined = audio?.granted === false;
  syncDayVisit(ended, declined ? "declined" : "captured");
  ensureNote(ended, Boolean(audio?.granted));
  return ended;
}

function ensureNote(visit: Visit, aiAssisted: boolean): Note {
  const existing = state.notes.find((n) => n.visitId === visit.id);
  if (existing) return existing;
  const now = nowIso();
  const note: Note = {
    id: nid("note"),
    visitId: visit.id,
    body: noteForPatient(visit.patientId, !aiAssisted),
    status: "draft",
    signedAt: null,
    signedBy: null,
    snapshot: null,
    retentionUntil: yearsFromNow(10),
    aiAssisted,
  };
  state.notes = [...state.notes, note];
  return note;
}

function ensureFollowUp(visit: Visit): FollowUp {
  const existing = state.followUps.find((f) => f.visitId === visit.id);
  if (existing) return existing;
  return createFollowUp(visit.id, followUpForPatient(visit.patientId));
}

export function createFollowUp(
  visitId: string,
  body: string,
  messageClass: FollowUp["messageClass"] = "clinical_transactional",
): FollowUp {
  const visit = getVisit(visitId);
  const note = state.notes.find((n) => n.visitId === visit.id);
  const style = sessionStyle();
  const drafted = applyStyle(body, style);
  const fu: FollowUp = {
    id: nid("fu"),
    visitId: visit.id,
    patientId: visit.patientId,
    noteId: note?.id ?? null,
    messageClass,
    channel: "secure",
    body: drafted,
    secureMessageId: null,
    notifySmsId: null,
    magicLinkToken: null,
    status: "draft",
    skipReason: null,
    lastError: null,
    sentAt: null,
  };
  state.followUps = [...state.followUps, fu];
  return fu;
}

export function getOrCreateNote(visitId: string): Note {
  const visit = getVisit(visitId);
  const audio = latestAudioConsent(visitId);
  return ensureNote(visit, Boolean(audio?.granted));
}

export function patchNote(visitId: string, body: string): Note {
  const note = getOrCreateNote(visitId);
  if (note.status === "signed") {
    throw new ApiError({
      error: "note_signed_immutable",
      message: "Cannot edit a signed note",
    });
  }
  const updated: Note = { ...note, body };
  state.notes = state.notes.map((n) => (n.id === note.id ? updated : n));
  recordLearningEvent({
    source: "note_edit",
    before: note.body,
    after: body,
    resourceId: note.id,
  });
  return updated;
}

export function signNote(visitId: string): Note {
  const note = getOrCreateNote(visitId);
  if (note.status === "signed") {
    throw new ApiError({ error: "already_signed", message: "Note is already signed" });
  }
  const signedAt = nowIso();
  const snapshot = {
    body: note.body,
    signedAt,
    signedBy: DEMO.userId,
    visitId,
  };
  const signed: Note = {
    ...note,
    status: "signed",
    signedAt,
    signedBy: DEMO.userId,
    snapshot,
  };
  state.notes = state.notes.map((n) => (n.id === note.id ? signed : n));
  recordLearningEvent({
    source: "note_sign",
    before: note.body,
    after: signed.body,
    resourceId: note.id,
  });
  const visit = getVisit(visitId);
  ensureFollowUp(visit);
  return signed;
}

export function listFollowUps(visitId: string) {
  getVisit(visitId);
  return state.followUps.filter((f) => f.visitId === visitId);
}

export function listVisitConsents(visitId: string) {
  getVisit(visitId);
  return state.consents.filter((c) => c.visitId === visitId);
}

export function listPendingFollowUps() {
  return state.followUps.filter((f) => f.status === "draft" || f.status === "queued" || f.status === "failed");
}

export function finishDay() {
  state.followUps = state.followUps.map((f) => (f.status === "draft" ? { ...f, status: "queued" as const } : f));
  state.dayFinished = true;
  const queued = listPendingFollowUps();
  return {
    dayClose: { date: TODAY, clinicId: DEMO.clinicId },
    pendingCount: queued.length,
    snapshot: { followUpIds: queued.map((f) => f.id) },
  };
}

export function patchFollowUp(id: string, body: string): FollowUp {
  const fu = state.followUps.find((f) => f.id === id);
  if (!fu) throw new ApiError({ error: "not_found", message: "follow-up" });
  if (fu.status === "sent" || fu.status === "skipped") {
    throw new ApiError({ error: "follow_up_frozen", message: `Cannot edit a ${fu.status} follow-up` });
  }
  const updated: FollowUp = { ...fu, body };
  state.followUps = state.followUps.map((f) => (f.id === id ? updated : f));
  return updated;
}

export function recordFollowUpEdit(id: string, before: string, after: string): FollowUpEdit {
  const fu = state.followUps.find((f) => f.id === id);
  if (!fu) throw new ApiError({ error: "not_found", message: "follow-up" });
  recordLearningEvent({
    source: "follow_up_edit",
    before,
    after,
    resourceId: id,
  });
  return { id: nid("edit"), followUpId: id, before, after };
}

export function recordLearningEvent(input: LearningEvent): void {
  state.learningEvents = appendLearningEvent(state.learningEvents, input, nowIso());
}

export function listLearningEvents(): StoredLearningEvent[] {
  return state.learningEvents.slice();
}

export function sessionStyle() {
  return styleHeuristicFromEvents(state.learningEvents);
}

export function skipFollowUp(id: string, reason?: string): FollowUp {
  const fu = state.followUps.find((f) => f.id === id);
  if (!fu) throw new ApiError({ error: "not_found", message: "follow-up" });
  if (fu.status === "sent") {
    throw new ApiError({ error: "already_sent", message: "Cannot skip a sent follow-up" });
  }
  const updated: FollowUp = {
    ...fu,
    status: "skipped",
    skipReason: reason ?? "skipped",
  };
  state.followUps = state.followUps.map((f) => (f.id === id ? updated : f));
  return updated;
}

export function sendFollowUp(id: string): FollowUpSendResult {
  const fu = state.followUps.find((f) => f.id === id);
  if (!fu) throw new ApiError({ error: "not_found", message: "follow-up" });
  if (fu.status === "skipped") {
    throw new ApiError({ error: "follow_up_skipped", message: "Cannot send a skipped follow-up" });
  }
  if (fu.status === "sent") {
    throw new ApiError({ error: "already_sent", message: "Follow-up already sent" });
  }
  if (fu.noteId) {
    const note = state.notes.find((n) => n.id === fu.noteId);
    if (!note || note.status !== "signed") {
      fail(fu, "unsigned_note");
      throw new ApiError({
        error: "unsigned_note",
        message: "Never send from an unsigned note",
      });
    }
  }
  if (!clinic.smsIdentity) {
    throw new ApiError({
      error: "missing_clinic_identity",
      message: "Clinic identity is required on the notify text",
    });
  }
  if (state.stoppedPatientIds.has(fu.patientId)) {
    fail(fu, "stop_opt_out");
    throw new ApiError({
      error: "stop_fail_closed",
      message: "STOP/unsubscribe honored — send fail-closed",
    });
  }
  const messaging = state.consents.find(
    (c) =>
      c.patientId === fu.patientId &&
      c.type === "messaging" &&
      c.messageClass === fu.messageClass &&
      c.granted &&
      !c.revokedAt,
  );
  if (!messaging) {
    const reason = fu.messageClass === "promotional" ? "promotional_fail_closed" : "missing_messaging_consent";
    fail(fu, reason);
    throw new ApiError({
      error: reason,
      message:
        fu.messageClass === "promotional"
          ? "Promotional messaging fail-closed without per-class consent"
          : "Clinical/transactional follow-ups require an active messaging consent record",
    });
  }
  const posted = postSecureMessage(fu);
  const updated: FollowUp = {
    ...fu,
    channel: "secure",
    status: "sent",
    sentAt: nowIso(),
    lastError: null,
    secureMessageId: posted.messageId,
    notifySmsId: posted.notifySmsId,
    magicLinkToken: posted.token,
  };
  state.followUps = state.followUps.map((f) => (f.id === id ? updated : f));
  return {
    ...updated,
    channelOfRecord: "secure",
    inboxPath: `/inbox/${posted.token}`,
    notifySms: { stub: true, vendorMessageId: posted.notifySmsId, containsPhi: false },
  };
}

function postSecureMessage(fu: FollowUp) {
  const now = nowIso();
  let thread = state.threads.find((t) => t.patientId === fu.patientId);
  if (!thread) {
    thread = { id: nid("thread"), patientId: fu.patientId, visitId: fu.visitId, messages: [] };
    state.threads = [...state.threads, thread];
  }
  const message: ChatMessage = {
    id: nid("msg"),
    threadId: thread.id,
    patientId: fu.patientId,
    authorType: "staff",
    body: fu.body,
    createdAt: now,
  };
  thread.messages = [...thread.messages, message];
  const token = state.inboxTokens[fu.patientId] ?? nid("inbox");
  state.inboxTokens[fu.patientId] = token;
  const notifySmsId = nid("sms");
  const patient = getPatient(fu.patientId);
  state.notifies = [
    ...state.notifies.filter((n) => n.followUpId !== fu.id),
    {
      followUpId: fu.id,
      to: patient.phone ?? "",
      body: notifyStubBody(clinic.smsIdentity, `olive://inbox/${token}`),
      clinicIdentity: clinic.smsIdentity,
      inboxToken: token,
    },
  ];
  return { token, messageId: message.id, notifySmsId };
}

export function getChat(patientId: string) {
  getPatient(patientId);
  const thread = state.threads.find((t) => t.patientId === patientId) ?? null;
  return { thread, messages: thread?.messages ?? [] };
}

export function listThreads() {
  return state.threads;
}

export function lastNotify(followUpId: string) {
  return state.notifies.find((n) => n.followUpId === followUpId) ?? null;
}

export function getInbox(token: string): MagicInbox {
  const patientId = Object.entries(state.inboxTokens).find(([, t]) => t === token)?.[0];
  if (!patientId) throw new ApiError({ error: "not_found", message: "inbox" });
  const patient = getPatient(patientId);
  const thread = state.threads.find((t) => t.patientId === patientId);
  const last = thread?.messages[thread.messages.length - 1];
  return {
    channelOfRecord: "secure",
    secureMessageId: last?.id,
    body: last?.body,
    stub: true,
    token,
    patientId,
    patientName: patient.displayName,
    clinicName: clinic.name,
    messages: thread?.messages ?? [],
  };
}

function fail(fu: FollowUp, lastError: string) {
  state.followUps = state.followUps.map((f) => (f.id === fu.id ? { ...f, status: "failed", lastError } : f));
}

export function latestAudioOutcome(visitId: string): "accepted" | "refused" | "none" {
  const c = latestAudioConsent(visitId);
  if (!c) return "none";
  return c.granted ? "accepted" : "refused";
}
