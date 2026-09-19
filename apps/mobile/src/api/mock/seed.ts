import { DEMO } from "../types";
import type {
  Clinic,
  Consent,
  DayPatient,
  FeatureFlags,
  FollowUp,
  Note,
  Patient,
  TranscriptSegment,
  User,
  Visit,
} from "../types";

export const DISCLOSURE_SCRIPT_ID = "audio-disclosure-v1";

export const TODAY = "2026-09-19";

export const flags: FeatureFlags = {
  aftercare: false,
  claimsGuard: false,
  phiTrainingAllowed: false,
  odWriteback: false,
  quebecLaw25: false,
};

export const clinic: Clinic = {
  id: DEMO.clinicId,
  name: "Harbourfront Dental",
  legalName: "Harbourfront Dental Inc.",
  smsIdentity: "Harbourfront Dental",
  phone: "+1-416-555-0199",
  email: "hello@harbourfront.demo",
  residencyRegion: "ca-central-1",
  country: "CA",
  province: "ON",
  phipaAgreementVersion: null,
  phipaAgreementAckedAt: null,
  phipaAgreementAckedBy: null,
};

export const user: User = {
  id: DEMO.userId,
  clinicId: DEMO.clinicId,
  email: "od@demo.olive.local",
  name: "Dr. Maya Chen",
  role: "od",
};

export const patients: Patient[] = [
  {
    id: DEMO.patientAlexId,
    clinicId: DEMO.clinicId,
    firstName: "Alex",
    lastName: "Rivera",
    displayName: "Alex Rivera",
    phone: "+1-416-555-0100",
    email: "alex@example.test",
    dateOfBirth: "1988-04-12",
  },
  {
    id: DEMO.patientSamId,
    clinicId: DEMO.clinicId,
    firstName: "Sam",
    lastName: "Park",
    displayName: "Sam Park",
    phone: "+1-416-555-0101",
    email: null,
    dateOfBirth: "1979-11-02",
  },
  {
    id: DEMO.patientJordanId,
    clinicId: DEMO.clinicId,
    firstName: "Jordan",
    lastName: "Hale",
    displayName: "Jordan Hale",
    phone: "+1-416-555-0102",
    email: null,
    dateOfBirth: "1994-07-21",
  },
];

export function initialVisits(now: string): Visit[] {
  return [
    {
      id: DEMO.visitAlexId,
      clinicId: DEMO.clinicId,
      patientId: DEMO.patientAlexId,
      providerId: DEMO.userId,
      status: "in_progress",
      startedAt: now,
      endedAt: null,
    },
  ];
}

export function initialConsents(now: string): Consent[] {
  return [
    {
      id: "00000000-0000-4000-8000-000000000010",
      clinicId: DEMO.clinicId,
      patientId: DEMO.patientAlexId,
      visitId: null,
      type: "messaging",
      messageClass: "clinical_transactional",
      granted: true,
      disclosureScriptId: null,
      grantedAt: now,
      revokedAt: null,
      createdBy: DEMO.userId,
      createdAt: now,
      channel: "in_app",
      obtainedFrom: "patient",
    },
  ];
}

export const dayRoster: DayPatient[] = [
  {
    patientId: DEMO.patientAlexId,
    displayName: "Alex Rivera",
    time: "09:00",
    reason: "Perio maintenance",
    visitId: DEMO.visitAlexId,
    visitStatus: "in_progress",
    recording: "pending_consent",
  },
  {
    patientId: DEMO.patientSamId,
    displayName: "Sam Park",
    time: "10:30",
    reason: "Crown seat #26",
    visitId: null,
    visitStatus: "scheduled",
    recording: "none",
  },
  {
    patientId: DEMO.patientJordanId,
    displayName: "Jordan Hale",
    time: "13:00",
    reason: "Emergency · #36",
    visitId: null,
    visitStatus: "scheduled",
    recording: "none",
  },
];

export const alexNoteDraft = `Perio maintenance — Alex Rivera

CC: Routine 3-month perio maintenance; mild tenderness LR posterior.

Exam: Generalized plaque at gingival margins, heaviest 36–37. Probing 3–4 mm with isolated 5 mm at 36 distal. No mobility. #26 provisional intact (Sam is the crown seat later today — not this visit).

Tx: Full-mouth debridement, irrigation, OHI along the gumline, reviewed interdental brush for 36–37.

Plan: Continue 3-month recall. Home: brush at 45°, interdental nightly, rinse as dispensed. Call if swelling or lingering tenderness.

AI drafted this note from the visit audio. Review before signing.`;

export const samNoteDraft = `Crown seat #26 — Sam Park

CC: Deliver zirconia crown #26.

Exam: Prep acceptable, contacts and occlusion checked after try-in. Shade A2 acceptable to patient.

Tx: Crown cemented with RMGI. Excess removed. Bite adjusted high on excursion.

Plan: Avoid sticky foods 24h. Sensitivity possible a few days. Call if the bite feels high.

AI drafted this note from the visit audio. Review before signing.`;

export const jordanNoteDraft = `Emergency #36 — Jordan Hale

CC: Spontaneous ache #36, worse overnight, cold lingering.

Exam: #36 large occlusal restoration, percussion +, cold linger ~8s. No swelling. #37 WNL.

Tx: Pulp tested, discussed RCT vs extraction. Patient elects RCT referral. Temporary sedative filling placed. Ibuprofen discussed.

Plan: Endo referral today. Soft diet. Return sooner if swelling.

AI drafted this note from the visit audio. Review before signing.`;

export const manualNoteStub = `Visit documented without Olive recording.

(Recording was declined. Write the clinical note here — this is not an AI draft.)`;

export const alexFollowUpBody =
  "Hi Alex — after today's perio visit, keep brushing along the gumline and use the interdental brush on the lower right. We're here if anything feels tender.";

export const samFollowUpBody =
  "Hi Sam — #26 crown is seated. Avoid sticky foods today. Call us if the bite feels high or sensitivity lingers past a few days.";

export const jordanFollowUpBody =
  "Hi Jordan — we placed a sedative filling on #36 and are referring you for a root canal. Take ibuprofen as discussed and call if swelling starts.";

export const alexSegments: TranscriptSegment[] = [
  {
    id: "seg-1",
    seq: 1,
    speakerLabel: "speaker_clinician",
    text: "How has the lower right been feeling since last time?",
    startMs: 4000,
    endMs: 8000,
  },
  {
    id: "seg-2",
    seq: 2,
    speakerLabel: "speaker_patient",
    text: "A little tender when I floss, but not shooting pain.",
    startMs: 8200,
    endMs: 12000,
  },
  {
    id: "seg-3",
    seq: 3,
    speakerLabel: "speaker_clinician",
    text: "I'm seeing a five millimetre pocket distal of 36. We'll clean that thoroughly and I'll show you the interdental brush.",
    startMs: 18000,
    endMs: 26000,
  },
  {
    id: "seg-4",
    seq: 4,
    speakerLabel: "speaker_patient",
    text: "Okay — nightly is fine. Same rinse as last time?",
    startMs: 26200,
    endMs: 30000,
  },
  {
    id: "seg-5",
    seq: 5,
    speakerLabel: "speaker_clinician",
    text: "Yes. Audio from this visit stays with the clinic record. Retention is clinic-controlled.",
    startMs: 36000,
    endMs: 42000,
  },
];

export function noteForPatient(patientId: string, declined: boolean): string {
  if (declined) return manualNoteStub;
  if (patientId === DEMO.patientAlexId) return alexNoteDraft;
  if (patientId === DEMO.patientSamId) return samNoteDraft;
  if (patientId === DEMO.patientJordanId) return jordanNoteDraft;
  return manualNoteStub;
}

export function followUpForPatient(patientId: string): string {
  if (patientId === DEMO.patientAlexId) return alexFollowUpBody;
  if (patientId === DEMO.patientSamId) return samFollowUpBody;
  if (patientId === DEMO.patientJordanId) return jordanFollowUpBody;
  return "Follow-up from today's visit. Call the clinic if anything changes.";
}

export const emptyFollowUps: FollowUp[] = [];
export const emptyNotes: Note[] = [];
