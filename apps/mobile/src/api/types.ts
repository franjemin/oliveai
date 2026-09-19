/**
 * Olive v1 Core client types — aligned to Backend PR #1
 * `contracts/openapi.yaml` (apps/api is source of truth).
 *
 * FE-only extras are marked. Do not send them as if they were contract fields.
 */

export type ApiErrorBody = {
  error: string;
  message: string;
  details?: unknown;
};

export class ApiError extends Error {
  error: string;
  details?: unknown;
  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.error = body.error;
    this.details = body.details;
  }
}

export type FeatureFlags = {
  aftercare: boolean;
  claimsGuard: boolean;
  phiTrainingAllowed: boolean;
  odWriteback: boolean;
  quebecLaw25: boolean;
};

export type UserRole = "dentist" | "staff" | "admin";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clinicId: string;
  /** Same as clinicId (OLI-12). MFA is Wave B. */
  tenantId?: string;
};

export type Clinic = {
  id: string;
  tenantId: string;
  name: string;
  legalName: string;
  smsIdentity: string;
  phone: string;
  /** Present on BE seed; not in OpenAPI Clinic schema. */
  email?: string | null;
  residencyRegion: string;
  country: string;
  province: string;
  phipaAgreementVersion: string | null;
  phipaAgreementAckedAt: string | null;
  phipaAgreementAckedBy: string | null;
};

export type PatientPms = {
  source: string;
  externalId: string;
};

/** OpenAPI `PatientProfile`. */
export type PatientProfile = {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  pms?: PatientPms | null;
};

export type Patient = PatientProfile;

export type VisitStatus = "in_progress" | "completed";

export type Visit = {
  id: string;
  clinicId: string;
  patientId: string;
  providerId: string;
  status: VisitStatus;
  startedAt: string;
  endedAt: string | null;
};

export type ConsentType = "audio_capture" | "messaging" | "training";
export type MessageClass = "clinical_transactional" | "promotional";
/** FE-only consent evidence extras (not on OpenAPI Consent). */
export type ConsentChannel = "in_app" | "tablet" | "verbal_attested";
export type ConsentParty = "patient" | "sdm";

export type Consent = {
  id: string;
  clinicId: string;
  patientId: string;
  visitId: string | null;
  type: ConsentType;
  messageClass: MessageClass | null;
  granted: boolean;
  disclosureScriptId: string | null;
  /** FE extras until OLI-6 evidence fields land on the contract. */
  grantedAt?: string | null;
  revokedAt?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  channel?: ConsentChannel;
  obtainedFrom?: ConsentParty;
};

export type ConsentInput = {
  type: ConsentType;
  granted: boolean;
  visitId?: string;
  messageClass?: MessageClass;
  disclosureScriptId?: string;
  channel?: ConsentChannel;
  obtainedFrom?: ConsentParty;
};

export type RecordingGateReason = "missing_audio_capture_consent" | "missing_disclosure_script_id";

export type RecordingGate =
  | { allowed: false; reason: RecordingGateReason | string }
  | { allowed: true; disclosureScriptId: string };

export type NoteStatus = "draft" | "signed";

export type Note = {
  id: string;
  visitId: string;
  body: string;
  status: NoteStatus;
  signedAt: string | null;
  signedBy: string | null;
  snapshot: Record<string, unknown> | null;
  retentionUntil: string;
  /**
   * FE-only (OLI-5). Contract Note has no aiAssisted flag —
   * derive via `isAiAssistedDraft` when the live API omits it.
   */
  aiAssisted?: boolean;
};

export type FollowUpStatus = "draft" | "queued" | "sent" | "failed" | "skipped";

/** Channel of record is secure in-app. Body is never the SMS payload. */
export type FollowUp = {
  id: string;
  visitId: string;
  patientId: string;
  noteId: string | null;
  messageClass: MessageClass;
  channel: "secure";
  body: string;
  secureMessageId: string | null;
  notifySmsId: string | null;
  magicLinkToken: string | null;
  status: FollowUpStatus;
  skipReason: string | null;
  lastError: string | null;
  sentAt: string | null;
};

export type FollowUpEdit = {
  id: string;
  followUpId: string;
  before: string;
  after: string;
};

export type NotifySmsStub = {
  stub: boolean;
  vendorMessageId?: string;
  containsPhi: false;
};

/** `POST /v1/follow-ups/:id/send` — FollowUp + send envelope. */
export type FollowUpSendResult = FollowUp & {
  channelOfRecord: "secure";
  inboxPath?: string;
  notifySms?: NotifySmsStub;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  authorType: "staff" | "patient" | "system";
  body: string;
  /** FE extras — not on OpenAPI ChatMessage. */
  patientId?: string;
  createdAt?: string;
};

export type ChatThread = {
  id: string;
  patientId: string;
  visitId: string | null;
};

export type ChatThreadView = ChatThread & {
  messages: ChatMessage[];
};

/** OpenAPI `GET /v1/inbox/{token}`. */
export type InboxPayload = {
  channelOfRecord: "secure";
  secureMessageId?: string;
  body?: string;
  stub?: boolean;
};

/** Inbox screen view — contract payload plus optional mock identity extras. */
export type MagicInbox = InboxPayload & {
  token: string;
  patientId?: string;
  patientName?: string;
  clinicName?: string;
  messages: ChatMessage[];
};

/** FE-only notify preview. SMS vendor is stubbed on BE — no last-notify route. */
export type NotifyStub = {
  followUpId: string;
  to: string;
  body: string;
  clinicIdentity: string;
  inboxToken: string;
};

export type LearningEventSource = "follow_up_edit" | "note_edit" | "note_sign";

/** FE + mock until a dedicated learning route lands. Follow-up uses FollowUpEdit `{before, after}`. */
export type LearningEvent = {
  source: LearningEventSource;
  before: string;
  after: string;
  resourceId: string;
};

export type StoredLearningEvent = LearningEvent & { at: string };

export type TranscriptSegment = {
  id: string;
  seq: number;
  speakerLabel: string;
  text: string;
  startMs: number;
  endMs: number;
};

export type TranscriptionJob = {
  id: string;
  visitId?: string;
  status: "queued" | "processing" | "completed" | "failed";
  vendor?: string;
};

export type TranscriptResponse = {
  transcript: { id: string; visitId: string; retentionUntil: string } | null;
  segments: TranscriptSegment[];
  job: TranscriptionJob | null;
};

/** OpenAPI DayPatients row. */
export type DayPatientContract = {
  visitId?: string;
  visitStatus?: string;
  startedAt?: string;
  endedAt?: string | null;
  patient?: {
    id: string;
    displayName: string;
    phone?: string | null;
    source?: "local" | "imported";
    pmsExternalId?: string | null;
  };
};

export type DayPatientsResponse = {
  date: string;
  patients: DayPatientContract[];
};

export type DayRecording = "none" | "pending_consent" | "live" | "declined" | "captured";

/**
 * Today-tab view model.
 * `time` / `reason` / `recording` are FE extras until the day-feed contract grows them.
 */
export type DayPatient = {
  patientId: string;
  displayName: string;
  visitId: string | null;
  visitStatus: VisitStatus | "scheduled" | string;
  startedAt?: string;
  endedAt?: string | null;
  source?: "local" | "imported";
  time?: string;
  reason?: string;
  recording?: DayRecording;
};

export type DayFeed = {
  date: string;
  patients: DayPatient[];
};

export type FinishDayResult = {
  dayClose?: unknown;
  pendingCount?: number;
  snapshot?: unknown;
};

export type StyleHeuristic = {
  preferShorter?: boolean;
  greeting?: string | null;
  editCount?: number;
};

export type SessionBootstrap = {
  user: User;
  clinic: Clinic;
  flags: FeatureFlags;
  style?: StyleHeuristic;
};

export type Session = SessionBootstrap & {
  token: string;
  expiresAt: string;
};

export type CaptureSession = {
  visitId: string;
  disclosureScriptId: string;
  startedAt: string;
};

export interface OliveApi {
  login(email: string, password: string): Promise<Session>;
  session(): Promise<SessionBootstrap>;
  clinic(): Promise<Clinic>;
  flags(): Promise<{ flags: FeatureFlags }>;
  patients(): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient>;
  dayPatients(date: string): Promise<DayFeed>;
  finishDay(date: string): Promise<FinishDayResult>;
  createVisit(patientId: string): Promise<Visit>;
  getVisit(id: string): Promise<Visit>;
  endVisit(id: string): Promise<Visit>;
  recordingGate(visitId: string): Promise<RecordingGate>;
  recordVisitConsent(visitId: string, input: ConsentInput): Promise<Consent>;
  listVisitConsents(visitId: string): Promise<Consent[]>;
  getTranscript(visitId: string): Promise<TranscriptResponse>;
  getNote(visitId: string): Promise<Note>;
  patchNote(visitId: string, body: string): Promise<Note>;
  signNote(visitId: string): Promise<Note>;
  listFollowUps(visitId: string): Promise<FollowUp[]>;
  /** FE convenience — no global `GET /v1/follow-ups`. Composed from the day feed. */
  listPendingFollowUps(): Promise<FollowUp[]>;
  sendFollowUp(id: string): Promise<FollowUpSendResult>;
  skipFollowUp(id: string, reason?: string): Promise<FollowUp>;
  patchFollowUp(id: string, body: string): Promise<FollowUp>;
  recordFollowUpEdit(id: string, before: string, after: string): Promise<FollowUpEdit>;
  /**
   * Persist a before/after voice-learning event. Never a no-op.
   * Follow-up edits also POST OpenAPI `{ before, after }` when the HTTP client is live.
   */
  recordLearningEvent(input: LearningEvent): Promise<void>;
  listLearningEvents(): Promise<StoredLearningEvent[]>;
  getChat(patientId: string): Promise<{ thread: ChatThread | null; messages: ChatMessage[] }>;
  /** FE convenience — no `GET /v1/chats`. Composed from patients + per-patient chat. */
  listThreads(): Promise<ChatThreadView[]>;
  lastNotify(followUpId: string): Promise<NotifyStub | null>;
  getInbox(token: string): Promise<MagicInbox>;
  /** Demo-ready: ingest stub audio (BE queues a fake transcript job). */
  postVisitAudio(visitId: string, bytesBase64: string): Promise<{
    asset?: { id?: string; visitId?: string; objectKey?: string };
    job?: TranscriptionJob;
  }>;
  /** Dev-only — process queued transcription jobs once (`happy-path.sh`). */
  processJobs(): Promise<{ processed?: number }>;
  createFollowUp(visitId: string, body: string, messageClass?: MessageClass): Promise<FollowUp>;
}

export const DEMO = {
  clinicId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
  patientAlexId: "00000000-0000-4000-8000-000000000003",
  patientSamId: "00000000-0000-4000-8000-000000000004",
  visitAlexId: "00000000-0000-4000-8000-000000000005",
  patientJordanId: "00000000-0000-4000-8000-000000000006",
  date: "2026-09-19",
  loginEmail: "od@demo.olive.local",
  loginPassword: "demo",
} as const;

/** OLI-5: AI-draft badge when the contract Note omits `aiAssisted`. */
export function isAiAssistedDraft(note: Note, recordingDeclined?: boolean): boolean {
  if (recordingDeclined) return false;
  if (typeof note.aiAssisted === "boolean") return note.aiAssisted;
  return /AI drafted this note/i.test(note.body);
}
