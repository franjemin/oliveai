/** Locked Olive v1 Core API shapes (Backend PR #1 / docs/api.md). */

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

export type Clinic = {
  id: string;
  name: string;
  legalName: string;
  smsIdentity: string;
  phone: string;
  email: string | null;
  residencyRegion: string;
  country: string;
  province: string;
  phipaAgreementVersion: string | null;
  phipaAgreementAckedAt: string | null;
  phipaAgreementAckedBy: string | null;
};

export type User = {
  id: string;
  clinicId: string;
  email: string;
  name: string;
  role: "owner" | "od" | "staff";
};

export type Patient = {
  id: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
};

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
  grantedAt: string | null;
  revokedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  channel: ConsentChannel;
  obtainedFrom: ConsentParty;
};

export type RecordingGate =
  | { allowed: false; reason: string }
  | { allowed: true; disclosureScriptId: string };

export type NoteStatus = "draft" | "signed";

export type NoteSnapshot = {
  body: string;
  signedAt: string;
  signedBy: string;
  visitId: string;
};

export type Note = {
  id: string;
  clinicId: string;
  visitId: string;
  body: string;
  status: NoteStatus;
  signedAt: string | null;
  signedBy: string | null;
  snapshot: NoteSnapshot | null;
  retentionUntil: string;
  createdAt: string;
  updatedAt: string;
  aiAssisted: boolean;
};

export type FollowUpStatus = "draft" | "queued" | "sent" | "failed" | "skipped";

export type FollowUp = {
  id: string;
  clinicId: string;
  visitId: string;
  patientId: string;
  noteId: string | null;
  messageClass: MessageClass;
  /** Notify channel for the magic-link text — not the secure-message body. */
  channel: "sms";
  /** Secure-message content (body of record). Never treat this as an SMS. */
  body: string;
  status: FollowUpStatus;
  skipReason: string | null;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  patientId: string;
  authorType: "staff" | "patient" | "system";
  body: string;
  createdAt: string;
};

export type ChatThread = {
  id: string;
  patientId: string;
  visitId: string | null;
  messages: ChatMessage[];
};

export type NotifyStub = {
  followUpId: string;
  to: string;
  body: string;
  clinicIdentity: string;
  inboxToken: string;
};

export type LearningEvent = {
  source: "follow_up_edit" | "note_edit" | "note_sign";
  before: string;
  after: string;
  resourceId: string;
};

export type MagicInbox = {
  token: string;
  patientId: string;
  patientName: string;
  clinicName: string;
  messages: ChatMessage[];
};

export type TranscriptSegment = {
  id: string;
  seq: number;
  speakerLabel: string;
  text: string;
  startMs: number;
  endMs: number;
};

export type TranscriptJob = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
};

export type TranscriptResponse = {
  transcript: { id: string; visitId: string; retentionUntil: string } | null;
  segments: TranscriptSegment[];
  job: TranscriptJob | null;
};

export type DayPatient = {
  patientId: string;
  displayName: string;
  time: string;
  reason: string;
  visitId: string | null;
  visitStatus: VisitStatus | "scheduled";
  recording: "none" | "pending_consent" | "live" | "declined" | "captured";
};

export type DayFeed = {
  date: string;
  patients: DayPatient[];
};

export type Session = {
  token: string;
  expiresAt: string;
  user: User;
  clinic: Clinic;
  flags: FeatureFlags;
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

export type CaptureSession = {
  visitId: string;
  disclosureScriptId: string;
  startedAt: string;
};

export interface OliveApi {
  login(email: string, password: string): Promise<Session>;
  session(): Promise<Omit<Session, "token" | "expiresAt">>;
  clinic(): Promise<Clinic>;
  flags(): Promise<{ flags: FeatureFlags }>;
  patients(): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient>;
  dayPatients(date: string): Promise<DayFeed>;
  finishDay(date: string): Promise<{ date: string; queued: FollowUp[] }>;
  createVisit(patientId: string): Promise<Visit>;
  getVisit(id: string): Promise<Visit>;
  endVisit(id: string): Promise<Visit>;
  recordingGate(visitId: string): Promise<RecordingGate>;
  recordVisitConsent(visitId: string, input: ConsentInput): Promise<Consent>;
  getTranscript(visitId: string): Promise<TranscriptResponse>;
  getNote(visitId: string): Promise<Note>;
  patchNote(visitId: string, body: string): Promise<Note>;
  signNote(visitId: string): Promise<Note>;
  listFollowUps(visitId: string): Promise<FollowUp[]>;
  listPendingFollowUps(): Promise<FollowUp[]>;
  sendFollowUp(id: string): Promise<FollowUp>;
  skipFollowUp(id: string, reason?: string): Promise<FollowUp>;
  patchFollowUp(id: string, body: string): Promise<FollowUp>;
  recordFollowUpEdit(id: string, before: string, after: string): Promise<void>;
  recordLearningEvent(input: LearningEvent): Promise<void>;
  getChat(patientId: string): Promise<{ thread: ChatThread | null; messages: ChatMessage[] }>;
  listThreads(): Promise<ChatThread[]>;
  lastNotify(followUpId: string): Promise<NotifyStub | null>;
  getInbox(token: string): Promise<MagicInbox>;
}

export const DEMO = {
  clinicId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
  patientAlexId: "00000000-0000-4000-8000-000000000003",
  patientSamId: "00000000-0000-4000-8000-000000000004",
  visitAlexId: "00000000-0000-4000-8000-000000000005",
  patientJordanId: "00000000-0000-4000-8000-000000000006",
} as const;
