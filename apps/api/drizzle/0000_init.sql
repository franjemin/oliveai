CREATE TYPE "user_role" AS ENUM ('dentist', 'staff', 'admin');
CREATE TYPE "visit_status" AS ENUM ('in_progress', 'completed');
CREATE TYPE "consent_type" AS ENUM ('audio_capture', 'messaging', 'training');
CREATE TYPE "message_class" AS ENUM ('clinical_transactional', 'promotional');
CREATE TYPE "note_status" AS ENUM ('draft', 'signed');
CREATE TYPE "follow_up_status" AS ENUM ('draft', 'queued', 'sent', 'failed', 'skipped');
CREATE TYPE "job_status" AS ENUM ('queued', 'processing', 'completed', 'failed');
CREATE TYPE "author_type" AS ENUM ('staff', 'patient', 'system');

CREATE TABLE "clinics" (
  "id" uuid PRIMARY KEY,
  "name" text NOT NULL,
  "legal_name" text NOT NULL,
  "sms_identity" text NOT NULL,
  "phone" text NOT NULL,
  "email" text,
  "residency_region" text NOT NULL DEFAULT 'ca-central-1',
  "country" text NOT NULL DEFAULT 'CA',
  "province" text NOT NULL DEFAULT 'ON',
  "phipa_agreement_version" text,
  "phipa_agreement_acked_at" timestamptz,
  "phipa_agreement_acked_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "email" text NOT NULL,
  "name" text NOT NULL,
  "role" "user_role" NOT NULL DEFAULT 'dentist',
  "password_hash" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "users_clinic_email" ON "users" ("clinic_id", "email");

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "patients" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "display_name" text NOT NULL,
  "phone" text,
  "email" text,
  "date_of_birth" date,
  "pms_external_id" text,
  "pms_source" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "visits" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  "provider_id" uuid NOT NULL REFERENCES "users"("id"),
  "status" "visit_status" NOT NULL DEFAULT 'in_progress',
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "ended_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "consents" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  "visit_id" uuid REFERENCES "visits"("id"),
  "type" "consent_type" NOT NULL,
  "message_class" "message_class",
  "granted" boolean NOT NULL,
  "disclosure_script_id" text,
  "granted_at" timestamptz,
  "revoked_at" timestamptz,
  "created_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "messaging_opt_outs" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  "channel" text NOT NULL DEFAULT 'sms',
  "message_class" "message_class",
  "opted_out_at" timestamptz NOT NULL DEFAULT now(),
  "keyword" text NOT NULL DEFAULT 'STOP',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "visit_speakers" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "visit_id" uuid NOT NULL REFERENCES "visits"("id"),
  "speaker_label" text NOT NULL,
  "role_hint" text NOT NULL DEFAULT 'unknown',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "visit_speakers_visit_label" ON "visit_speakers" ("visit_id", "speaker_label");

CREATE TABLE "audio_assets" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "visit_id" uuid NOT NULL REFERENCES "visits"("id"),
  "object_key" text NOT NULL,
  "content_type" text NOT NULL DEFAULT 'audio/webm',
  "byte_size" integer NOT NULL DEFAULT 0,
  "checksum" text,
  "delete_after" timestamptz,
  "deleted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "transcription_jobs" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "visit_id" uuid NOT NULL REFERENCES "visits"("id"),
  "audio_asset_id" uuid NOT NULL REFERENCES "audio_assets"("id"),
  "status" "job_status" NOT NULL DEFAULT 'queued',
  "vendor" text NOT NULL DEFAULT 'stub',
  "error" text,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "transcripts" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "visit_id" uuid NOT NULL REFERENCES "visits"("id"),
  "job_id" uuid NOT NULL REFERENCES "transcription_jobs"("id"),
  "retention_until" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "transcript_segments" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "visit_id" uuid NOT NULL REFERENCES "visits"("id"),
  "transcript_id" uuid NOT NULL REFERENCES "transcripts"("id"),
  "seq" integer NOT NULL,
  "speaker_label" text NOT NULL,
  "text" text NOT NULL,
  "start_ms" integer NOT NULL DEFAULT 0,
  "end_ms" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "notes" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "visit_id" uuid NOT NULL REFERENCES "visits"("id"),
  "body" text NOT NULL DEFAULT '',
  "status" "note_status" NOT NULL DEFAULT 'draft',
  "signed_at" timestamptz,
  "signed_by" uuid,
  "snapshot" jsonb,
  "retention_until" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "notes_visit_unique" ON "notes" ("visit_id");

CREATE TABLE "follow_ups" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "visit_id" uuid NOT NULL REFERENCES "visits"("id"),
  "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  "note_id" uuid REFERENCES "notes"("id"),
  "message_class" "message_class" NOT NULL DEFAULT 'clinical_transactional',
  "channel" text NOT NULL DEFAULT 'secure',
  "body" text NOT NULL,
  "secure_message_id" text,
  "notify_sms_id" text,
  "magic_link_token" text,
  "status" "follow_up_status" NOT NULL DEFAULT 'draft',
  "skip_reason" text,
  "last_error" text,
  "sent_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "note_edits" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "note_id" uuid NOT NULL REFERENCES "notes"("id"),
  "before" text NOT NULL,
  "after" text NOT NULL,
  "created_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "clinician_style_profiles" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "clinician_id" uuid NOT NULL REFERENCES "users"("id"),
  "prefer_shorter" boolean NOT NULL DEFAULT false,
  "greeting" text,
  "edit_count" integer NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "clinician_style_clinic_user" ON "clinician_style_profiles" ("clinic_id", "clinician_id");

CREATE TABLE "follow_up_edits" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "follow_up_id" uuid NOT NULL REFERENCES "follow_ups"("id"),
  "before" text NOT NULL,
  "after" text NOT NULL,
  "created_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "day_closes" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "date" date NOT NULL,
  "snapshot" jsonb NOT NULL,
  "finished_at" timestamptz NOT NULL DEFAULT now(),
  "finished_by" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "chat_threads" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  "visit_id" uuid REFERENCES "visits"("id"),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "chat_messages" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "thread_id" uuid NOT NULL REFERENCES "chat_threads"("id"),
  "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  "author_type" "author_type" NOT NULL,
  "author_id" uuid,
  "body" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "feature_flags" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "key" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "pms_import_jobs" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "source" text NOT NULL,
  "status" "job_status" NOT NULL DEFAULT 'completed',
  "stats" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "pms_writebacks" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "visit_id" uuid NOT NULL REFERENCES "visits"("id"),
  "note_id" uuid REFERENCES "notes"("id"),
  "target" text NOT NULL DEFAULT 'open_dental',
  "status" text NOT NULL DEFAULT 'flagged_unimplemented',
  "error" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "audit_events" (
  "id" uuid PRIMARY KEY,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "actor_id" uuid,
  "action" text NOT NULL,
  "resource_type" text NOT NULL,
  "resource_id" uuid,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "audit_clinic_created" ON "audit_events" ("clinic_id", "created_at");
CREATE INDEX "consents_visit_type" ON "consents" ("visit_id", "type");
CREATE INDEX "audio_delete_after" ON "audio_assets" ("delete_after");
