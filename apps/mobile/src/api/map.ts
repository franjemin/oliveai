import type {
  ChatMessage,
  DayFeed,
  DayPatient,
  DayPatientContract,
  DayPatientsResponse,
  FollowUp,
  InboxPayload,
  MagicInbox,
  Patient,
} from "./types";

export function formatDayTime(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function mapDayPatient(row: DayPatientContract): DayPatient {
  return {
    patientId: row.patient?.id ?? "",
    displayName: row.patient?.displayName ?? "Patient",
    visitId: row.visitId ?? null,
    visitStatus: row.visitStatus ?? "scheduled",
    startedAt: row.startedAt,
    endedAt: row.endedAt ?? null,
    source: row.patient?.source,
    time: formatDayTime(row.startedAt),
    unsignedDraft: row.unsignedDraft,
  };
}

export function mapDayFeed(raw: DayPatientsResponse): DayFeed {
  return {
    date: raw.date,
    followUpRelease: raw.followUpRelease,
    patients: (raw.patients ?? []).map(mapDayPatient).filter((row) => row.patientId),
  };
}

export function unwrapPatients(raw: { patients?: Patient[] } | Patient[] | undefined): Patient[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.patients ?? [];
}

export function unwrapPatient(raw: { patient?: Patient; profile?: Patient } | Patient | undefined): Patient | null {
  if (!raw) return null;
  if ("patient" in raw || "profile" in raw) {
    const wrapped = raw as { patient?: Patient; profile?: Patient };
    return wrapped.patient ?? wrapped.profile ?? null;
  }
  if ("id" in raw && typeof raw.id === "string") return raw;
  return null;
}

export function unwrapFollowUps(raw: { followUps?: FollowUp[] } | FollowUp[] | undefined): FollowUp[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.followUps ?? [];
}

export function unwrapConsents<T>(raw: { consents?: T[] } | T[] | undefined): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.consents ?? [];
}

export function tokenFromInboxPath(path?: string): string | undefined {
  if (!path) return undefined;
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export function mapInbox(token: string, payload: InboxPayload, extras?: Partial<MagicInbox>): MagicInbox {
  const messages: ChatMessage[] =
    extras?.messages ??
    (payload.body
      ? [
          {
            id: payload.secureMessageId ?? token,
            threadId: token,
            authorType: "staff",
            body: payload.body,
          },
        ]
      : []);
  return {
    channelOfRecord: payload.channelOfRecord ?? "secure",
    secureMessageId: payload.secureMessageId,
    body: payload.body,
    stub: payload.stub,
    token,
    patientId: extras?.patientId,
    patientName: extras?.patientName,
    clinicName: extras?.clinicName,
    messages,
  };
}

export function isPendingFollowUp(fu: FollowUp): boolean {
  return fu.status === "draft" || fu.status === "queued" || fu.status === "failed";
}
