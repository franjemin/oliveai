import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["dentist", "staff", "admin"]);
export const visitStatusEnum = pgEnum("visit_status", ["in_progress", "completed"]);
export const consentTypeEnum = pgEnum("consent_type", ["audio_capture", "messaging", "training"]);
export const messageClassEnum = pgEnum("message_class", ["clinical_transactional", "promotional"]);
export const noteStatusEnum = pgEnum("note_status", ["draft", "signed"]);
export const followUpStatusEnum = pgEnum("follow_up_status", [
  "draft",
  "queued",
  "sent",
  "failed",
  "skipped",
]);
export const jobStatusEnum = pgEnum("job_status", ["queued", "processing", "completed", "failed"]);
export const authorTypeEnum = pgEnum("author_type", ["staff", "patient", "system"]);

const clinicScoped = {
  id: uuid("id").primaryKey(),
  clinicId: uuid("clinic_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  legalName: text("legal_name").notNull(),
  smsIdentity: text("sms_identity").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  residencyRegion: text("residency_region").notNull().default("ca-central-1"),
  country: text("country").notNull().default("CA"),
  province: text("province").notNull().default("ON"),
  phipaAgreementVersion: text("phipa_agreement_version"),
  phipaAgreementAckedAt: timestamp("phipa_agreement_acked_at", { withTimezone: true }),
  phipaAgreementAckedBy: uuid("phipa_agreement_acked_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  ...clinicScoped,
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("dentist"),
  passwordHash: text("password_hash").notNull(),
});

export const sessions = pgTable("sessions", {
  ...clinicScoped,
  userId: uuid("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const patients = pgTable("patients", {
  ...clinicScoped,
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  displayName: text("display_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  dateOfBirth: date("date_of_birth"),
  pmsExternalId: text("pms_external_id"),
  pmsSource: text("pms_source"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const visits = pgTable("visits", {
  ...clinicScoped,
  patientId: uuid("patient_id").notNull(),
  providerId: uuid("provider_id").notNull(),
  status: visitStatusEnum("status").notNull().default("in_progress"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const consents = pgTable("consents", {
  ...clinicScoped,
  patientId: uuid("patient_id").notNull(),
  visitId: uuid("visit_id"),
  type: consentTypeEnum("type").notNull(),
  messageClass: messageClassEnum("message_class"),
  granted: boolean("granted").notNull(),
  disclosureScriptId: text("disclosure_script_id"),
  grantedAt: timestamp("granted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
});

export const messagingOptOuts = pgTable("messaging_opt_outs", {
  ...clinicScoped,
  patientId: uuid("patient_id").notNull(),
  channel: text("channel").notNull().default("sms"),
  messageClass: messageClassEnum("message_class"),
  optedOutAt: timestamp("opted_out_at", { withTimezone: true }).notNull().defaultNow(),
  keyword: text("keyword").notNull().default("STOP"),
});

export const visitSpeakers = pgTable(
  "visit_speakers",
  {
    ...clinicScoped,
    visitId: uuid("visit_id").notNull(),
    speakerLabel: text("speaker_label").notNull(),
    roleHint: text("role_hint").notNull().default("unknown"),
  },
  (t) => [uniqueIndex("visit_speakers_visit_label").on(t.visitId, t.speakerLabel)],
);

export const audioAssets = pgTable("audio_assets", {
  ...clinicScoped,
  visitId: uuid("visit_id").notNull(),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull().default("audio/webm"),
  byteSize: integer("byte_size").notNull().default(0),
  checksum: text("checksum"),
  /** Unused — product lock: no auto-TTL. Clinic-controlled keep; delete only via clinic-initiated path. */
  deleteAfter: timestamp("delete_after", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const transcriptionJobs = pgTable("transcription_jobs", {
  ...clinicScoped,
  visitId: uuid("visit_id").notNull(),
  audioAssetId: uuid("audio_asset_id").notNull(),
  status: jobStatusEnum("status").notNull().default("queued"),
  vendor: text("vendor").notNull().default("stub"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const transcripts = pgTable("transcripts", {
  ...clinicScoped,
  visitId: uuid("visit_id").notNull(),
  jobId: uuid("job_id").notNull(),
  retentionUntil: timestamp("retention_until", { withTimezone: true }).notNull(),
});

export const transcriptSegments = pgTable("transcript_segments", {
  ...clinicScoped,
  visitId: uuid("visit_id").notNull(),
  transcriptId: uuid("transcript_id").notNull(),
  seq: integer("seq").notNull(),
  speakerLabel: text("speaker_label").notNull(),
  text: text("text").notNull(),
  startMs: integer("start_ms").notNull().default(0),
  endMs: integer("end_ms").notNull().default(0),
});

export const notes = pgTable("notes", {
  ...clinicScoped,
  visitId: uuid("visit_id").notNull(),
  body: text("body").notNull().default(""),
  status: noteStatusEnum("status").notNull().default("draft"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  signedBy: uuid("signed_by"),
  snapshot: jsonb("snapshot"),
  retentionUntil: timestamp("retention_until", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const followUps = pgTable("follow_ups", {
  ...clinicScoped,
  visitId: uuid("visit_id").notNull(),
  patientId: uuid("patient_id").notNull(),
  noteId: uuid("note_id"),
  messageClass: messageClassEnum("message_class").notNull().default("clinical_transactional"),
  channel: text("channel").notNull().default("sms"),
  body: text("body").notNull(),
  status: followUpStatusEnum("status").notNull().default("draft"),
  skipReason: text("skip_reason"),
  lastError: text("last_error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const followUpEdits = pgTable("follow_up_edits", {
  ...clinicScoped,
  followUpId: uuid("follow_up_id").notNull(),
  before: text("before").notNull(),
  after: text("after").notNull(),
  createdBy: uuid("created_by"),
});

export const dayCloses = pgTable("day_closes", {
  ...clinicScoped,
  date: date("date").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }).notNull().defaultNow(),
  finishedBy: uuid("finished_by").notNull(),
});

export const chatThreads = pgTable("chat_threads", {
  ...clinicScoped,
  patientId: uuid("patient_id").notNull(),
  visitId: uuid("visit_id"),
});

export const chatMessages = pgTable("chat_messages", {
  ...clinicScoped,
  threadId: uuid("thread_id").notNull(),
  patientId: uuid("patient_id").notNull(),
  authorType: authorTypeEnum("author_type").notNull(),
  authorId: uuid("author_id"),
  body: text("body").notNull(),
});

export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey(),
  clinicId: uuid("clinic_id"),
  key: text("key").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pmsImportJobs = pgTable("pms_import_jobs", {
  ...clinicScoped,
  source: text("source").notNull(),
  status: jobStatusEnum("status").notNull().default("completed"),
  stats: jsonb("stats").notNull(),
});

export const pmsWritebacks = pgTable("pms_writebacks", {
  ...clinicScoped,
  visitId: uuid("visit_id").notNull(),
  noteId: uuid("note_id"),
  target: text("target").notNull().default("open_dental"),
  status: text("status").notNull().default("flagged_unimplemented"),
  error: text("error"),
});

export const auditEvents = pgTable("audit_events", {
  ...clinicScoped,
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: uuid("resource_id"),
  metadata: jsonb("metadata"),
});

export const schema = {
  clinics,
  users,
  sessions,
  patients,
  visits,
  consents,
  messagingOptOuts,
  visitSpeakers,
  audioAssets,
  transcriptionJobs,
  transcripts,
  transcriptSegments,
  notes,
  followUps,
  followUpEdits,
  dayCloses,
  chatThreads,
  chatMessages,
  featureFlags,
  pmsImportJobs,
  pmsWritebacks,
  auditEvents,
};
