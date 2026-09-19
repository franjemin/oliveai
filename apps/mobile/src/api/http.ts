import { ApiError, type ChatThread, type OliveApi } from "./types";

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
  patients: () => req("/v1/patients"),
  getPatient: (id) => req(`/v1/patients/${id}`),
  dayPatients: (date) => req(`/v1/days/${date}/patients`),
  finishDay: (date) => req("/v1/days/finish", { method: "POST", body: JSON.stringify({ date }) }),
  createVisit: (patientId) => req("/v1/visits", { method: "POST", body: JSON.stringify({ patientId }) }),
  getVisit: (id) => req(`/v1/visits/${id}`),
  endVisit: (id) => req(`/v1/visits/${id}/end`, { method: "POST" }),
  recordingGate: (visitId) => req(`/v1/visits/${visitId}/recording-gate`),
  recordVisitConsent: (visitId, input) =>
    req(`/v1/visits/${visitId}/consent`, { method: "POST", body: JSON.stringify(input) }),
  getTranscript: (visitId) => req(`/v1/visits/${visitId}/transcript`),
  getNote: (visitId) => req(`/v1/visits/${visitId}/note`),
  patchNote: (visitId, body) =>
    req(`/v1/visits/${visitId}/note`, { method: "PATCH", body: JSON.stringify({ body }) }),
  signNote: (visitId) => req(`/v1/visits/${visitId}/note/sign`, { method: "POST" }),
  listFollowUps: (visitId) => req(`/v1/visits/${visitId}/follow-ups`),
  async listPendingFollowUps() {
    const feed = await req<{ followUps?: unknown[] }>("/v1/follow-ups").catch(() => ({ followUps: [] }));
    return (feed.followUps ?? []) as Awaited<ReturnType<OliveApi["listPendingFollowUps"]>>;
  },
  sendFollowUp: (id) => req(`/v1/follow-ups/${id}/send`, { method: "POST" }),
  skipFollowUp: (id, reason) =>
    req(`/v1/follow-ups/${id}/skip`, { method: "POST", body: JSON.stringify({ reason }) }),
  getChat: (patientId) => req(`/v1/patients/${patientId}/chat`),
  async listThreads() {
    const rows = await req<ChatThread[]>("/v1/chats").catch(() => []);
    return rows;
  },
  async lastNotify() {
    return null;
  },
  async getInbox() {
    throw new ApiError({
      error: "not_implemented",
      message: "Magic-link inbox is a demo mock until Backend exposes it.",
    });
  },
};
