import { DEMO, ApiError, type Consent, type FollowUp, type OliveApi, type Patient } from "./types";
import {
  isPendingFollowUp,
  mapDayFeed,
  mapInbox,
  unwrapConsents,
  unwrapFollowUps,
  unwrapPatient,
  unwrapPatients,
} from "./map";

const base = process.env.EXPO_PUBLIC_API_BASE ?? "http://localhost:3000";

let token: string | null = null;

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok) {
    throw new ApiError({
      error: json.error ?? "http_error",
      message: json.message ?? res.statusText,
      details: json,
    });
  }
  return json;
}

export const httpApi: OliveApi = {
  async login(email, password) {
    const session = await req<Awaited<ReturnType<OliveApi["login"]>>>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    token = session.token;
    return session;
  },
  session: () => req("/v1/session"),
  clinic: () => req("/v1/clinic"),
  flags: () => req("/v1/feature-flags"),
  async patients() {
    const raw = await req<{ patients?: Patient[] } | Patient[]>("/v1/patients");
    return unwrapPatients(raw);
  },
  async getPatient(id) {
    const raw = await req<{ patient?: Patient; profile?: Patient } | Patient>(`/v1/patients/${id}`);
    const patient = unwrapPatient(raw);
    if (!patient) {
      throw new ApiError({ error: "not_found", message: "patient" });
    }
    return patient;
  },
  async dayPatients(date) {
    try {
      const raw = await req<{ date: string; patients: Parameters<typeof mapDayFeed>[0]["patients"] }>(
        `/v1/days/${date}/patients`,
      );
      return mapDayFeed(raw);
    } catch (err) {
      if (err instanceof ApiError && err.error === "day_feed_unavailable") {
        return { date, patients: [] };
      }
      throw err;
    }
  },
  finishDay: (date) => req("/v1/days/finish", { method: "POST", body: JSON.stringify({ date }) }),
  createVisit: (patientId) => req("/v1/visits", { method: "POST", body: JSON.stringify({ patientId }) }),
  getVisit: (id) => req(`/v1/visits/${id}`),
  endVisit: (id) => req(`/v1/visits/${id}/end`, { method: "POST" }),
  recordingGate: (visitId) => req(`/v1/visits/${visitId}/recording-gate`),
  recordVisitConsent: (visitId, input) =>
    req(`/v1/visits/${visitId}/consent`, {
      method: "POST",
      body: JSON.stringify({
        type: input.type,
        granted: input.granted,
        messageClass: input.messageClass,
        disclosureScriptId: input.disclosureScriptId,
      }),
    }),
  async listVisitConsents(visitId) {
    const raw = await req<{ consents?: Consent[] }>(`/v1/visits/${visitId}/consents`);
    return unwrapConsents(raw);
  },
  getTranscript: (visitId) => req(`/v1/visits/${visitId}/transcript`),
  getNote: (visitId) => req(`/v1/visits/${visitId}/note`),
  patchNote: (visitId, body) =>
    req(`/v1/visits/${visitId}/note`, { method: "PATCH", body: JSON.stringify({ body }) }),
  signNote: (visitId) => req(`/v1/visits/${visitId}/note/sign`, { method: "POST" }),
  async listFollowUps(visitId) {
    const raw = await req<{ followUps?: FollowUp[] }>(`/v1/visits/${visitId}/follow-ups`);
    return unwrapFollowUps(raw);
  },
  async listPendingFollowUps() {
    const feed = await httpApi.dayPatients(DEMO.date);
    const visitIds = [...new Set(feed.patients.map((row) => row.visitId).filter((id): id is string => Boolean(id)))];
    const batches = await Promise.all(visitIds.map((id) => httpApi.listFollowUps(id).catch(() => [])));
    return batches.flat().filter(isPendingFollowUp);
  },
  sendFollowUp: (id) => req(`/v1/follow-ups/${id}/send`, { method: "POST" }),
  skipFollowUp: (id, reason) =>
    req(`/v1/follow-ups/${id}/skip`, { method: "POST", body: JSON.stringify({ reason }) }),
  patchFollowUp: (id, body) =>
    req(`/v1/follow-ups/${id}`, { method: "PATCH", body: JSON.stringify({ body }) }),
  recordFollowUpEdit: (id, before, after) =>
    req(`/v1/follow-ups/${id}/edits`, { method: "POST", body: JSON.stringify({ before, after }) }),
  async recordLearningEvent() {
    /* OpenAPI only stores follow-up edits. Note-edit / sign heuristics stay local. */
  },
  async getChat(patientId) {
    const raw = await req<{ thread?: { id: string; patientId: string; visitId: string | null } | null; messages?: unknown[] }>(
      `/v1/patients/${patientId}/chat`,
    );
    return { thread: raw.thread ?? null, messages: (raw.messages ?? []) as Awaited<ReturnType<OliveApi["getChat"]>>["messages"] };
  },
  async listThreads() {
    const patients = await httpApi.patients();
    const threads = await Promise.all(
      patients.map(async (patient) => {
        try {
          const { thread, messages } = await httpApi.getChat(patient.id);
          if (!thread) return null;
          return { ...thread, messages };
        } catch {
          return null;
        }
      }),
    );
    return threads.filter((row): row is NonNullable<typeof row> => row !== null);
  },
  async lastNotify() {
    /* SMS vendor is stubbed on BE — no last-notify route. Use send envelope notifySms. */
    return null;
  },
  async getInbox(inboxToken) {
    const payload = await req<{
      channelOfRecord?: "secure";
      secureMessageId?: string;
      body?: string;
      stub?: boolean;
    }>(`/v1/inbox/${inboxToken}`);
    return mapInbox(inboxToken, {
      channelOfRecord: payload.channelOfRecord ?? "secure",
      secureMessageId: payload.secureMessageId,
      body: payload.body,
      stub: payload.stub,
    });
  },
};
