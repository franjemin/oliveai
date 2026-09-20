import { followUpEditContractBody, httpLearningLog } from "./learning";
import { DEMO, ApiError, type Consent, type FollowUp, type FollowUpEdit, type OliveApi, type Patient } from "./types";
import {
  isPendingFollowUp,
  mapDayFeed,
  mapInbox,
  unwrapConsents,
  unwrapFollowUps,
  unwrapPatient,
  unwrapPatients,
} from "./map";
import { clinicDayDates } from "./walkthrough";

const base = process.env.EXPO_PUBLIC_API_BASE ?? "http://localhost:3000";

let token: string | null = null;
const postedFollowUpEdits = new Set<string>();

function followUpEditKey(id: string, before: string, after: string): string {
  return `${id}\0${before}\0${after}`;
}

async function postFollowUpEdit(id: string, before: string, after: string): Promise<FollowUpEdit> {
  const key = followUpEditKey(id, before, after);
  if (postedFollowUpEdits.has(key)) {
    return { id: `dedup-edit-${id}`, followUpId: id, before, after };
  }
  postedFollowUpEdits.add(key);
  try {
    return await req<FollowUpEdit>(`/v1/follow-ups/${id}/edits`, {
      method: "POST",
      body: JSON.stringify(followUpEditContractBody({ before, after })),
    });
  } catch {
    postedFollowUpEdits.delete(key);
    return { id: `local-edit-${id}`, followUpId: id, before, after };
  }
}

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
    const visitIds = new Set<string>([DEMO.visitAlexId]);
    const unsignedVisits = new Set<string>();
    for (const date of clinicDayDates()) {
      const feed = await httpApi.dayPatients(date).catch(() => ({ date, patients: [] as { visitId?: string | null; unsignedDraft?: boolean }[] }));
      for (const row of feed.patients) {
        if (row.visitId) visitIds.add(row.visitId);
        if (row.visitId && row.unsignedDraft) unsignedVisits.add(row.visitId);
      }
    }
    const batches = await Promise.all([...visitIds].map((id) => httpApi.listFollowUps(id).catch(() => [])));
    return batches.flat().filter((fu) => isPendingFollowUp(fu) && !unsignedVisits.has(fu.visitId));
  },
  sendFollowUp: (id) => req(`/v1/follow-ups/${id}/send`, { method: "POST" }),
  skipFollowUp: (id, reason) =>
    req(`/v1/follow-ups/${id}/skip`, { method: "POST", body: JSON.stringify({ reason }) }),
  patchFollowUp: (id, body) =>
    req(`/v1/follow-ups/${id}`, { method: "PATCH", body: JSON.stringify({ body }) }),
  async recordFollowUpEdit(id, before, after) {
    httpLearningLog.remember({ source: "follow_up_edit", before, after, resourceId: id });
    return postFollowUpEdit(id, before, after);
  },
  async recordLearningEvent(input) {
    httpLearningLog.remember(input);
    if (input.source !== "follow_up_edit") return;
    await postFollowUpEdit(input.resourceId, input.before, input.after);
  },
  async listLearningEvents() {
    return httpLearningLog.list();
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
  postVisitAudio: (visitId, bytesBase64) =>
    req(`/v1/visits/${visitId}/audio`, { method: "POST", body: JSON.stringify({ bytesBase64 }) }),
  processJobs: () => req("/v1/dev/process-jobs", { method: "POST" }),
  createFollowUp: (visitId, body, messageClass) =>
    req(`/v1/visits/${visitId}/follow-ups`, {
      method: "POST",
      body: JSON.stringify({ body, messageClass }),
    }),
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
