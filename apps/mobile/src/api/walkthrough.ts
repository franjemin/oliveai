import { formatDayTime } from "./map";
import { DEMO, type DayFeed, type DayPatient, type Patient, type Visit } from "./types";

/** Tech Lead Core walkthrough — same IDs as Backend PR #1 seed + happy-path.sh */
export const CORE_WALKTHROUGH = {
  loginEmail: DEMO.loginEmail,
  loginPassword: DEMO.loginPassword,
  clinicId: DEMO.clinicId,
  visitId: DEMO.visitAlexId,
  patientId: DEMO.patientAlexId,
  patientName: "Alex Rivera",
  disclosureScriptId: "audio-disclosure-v1",
  /** `olive-demo-audio` — same stub as apps/api/scripts/happy-path.sh */
  demoAudioBase64: "b2xpdmUtZGVtby1hdWRpbw==",
  followUpBody:
    "Hi Alex — after today's perio visit, keep brushing along the gumline and use the interdental brush on the lower right. We're here if anything feels tender.",
} as const;

export function utcDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Live seed uses visit.startedAt (today). Contract examples use 2026-09-19. Try both. */
export function clinicDayDates(now = new Date()): string[] {
  return [...new Set([utcDate(now), DEMO.date])];
}

export function seededVisitRow(visit: Visit, patient?: Patient | null, prior?: DayPatient | null): DayPatient {
  const completed = visit.status === "completed" || Boolean(visit.endedAt);
  return {
    patientId: visit.patientId,
    displayName: patient?.displayName ?? CORE_WALKTHROUGH.patientName,
    visitId: visit.id,
    visitStatus: visit.status,
    startedAt: visit.startedAt,
    endedAt: visit.endedAt,
    time: formatDayTime(visit.startedAt),
    reason: prior?.reason ?? "Perio maintenance · 45 min",
    recording: prior?.recording ?? (visit.status === "in_progress" ? "pending_consent" : "captured"),
    unsignedDraft: prior?.unsignedDraft ?? (completed ? true : undefined),
  };
}

/** Pin Alex / visit …0005 at the top of Today so the Core walk never depends on day-feed date. */
export function ensureSeededVisit(feed: DayFeed, visit: Visit, patient?: Patient | null): DayFeed {
  const prior = feed.patients.find((p) => p.visitId === visit.id || p.patientId === visit.patientId) ?? null;
  const row = seededVisitRow(visit, patient, prior);
  const rest = feed.patients.filter((p) => p.visitId !== visit.id && p.patientId !== visit.patientId);
  return { ...feed, patients: [row, ...rest] };
}
