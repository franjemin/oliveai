import type { ConsentInput, OliveApi, Session } from "../types";
import { ApiError } from "../types";
import * as store from "./store";

const DEMO_TOKEN = "mock-session-harbourfront";

export const mockApi: OliveApi = {
  async login(email, password) {
    if (email !== "od@demo.olive.local" || password !== "demo") {
      throw new ApiError({ error: "unauthorized", message: "Invalid demo credentials" });
    }
    return {
      token: DEMO_TOKEN,
      expiresAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
      user: store.getUser(),
      clinic: store.getClinic(),
      flags: store.getFlags(),
    } satisfies Session;
  },
  async session() {
    return { user: store.getUser(), clinic: store.getClinic(), flags: store.getFlags() };
  },
  async clinic() {
    return store.getClinic();
  },
  async flags() {
    return { flags: store.getFlags() };
  },
  async patients() {
    return store.listPatients();
  },
  async getPatient(id) {
    return store.getPatient(id);
  },
  async dayPatients() {
    return store.dayFeed();
  },
  async finishDay() {
    return store.finishDay();
  },
  async createVisit(patientId) {
    return store.createVisit(patientId);
  },
  async getVisit(id) {
    return store.getVisit(id);
  },
  async endVisit(id) {
    return store.endVisit(id);
  },
  async recordingGate(visitId) {
    return store.recordingGate(visitId);
  },
  async recordVisitConsent(visitId, input: ConsentInput) {
    return store.recordVisitConsent(visitId, input);
  },
  async getTranscript(visitId) {
    return store.getTranscript(visitId);
  },
  async getNote(visitId) {
    return store.getOrCreateNote(visitId);
  },
  async patchNote(visitId, body) {
    return store.patchNote(visitId, body);
  },
  async signNote(visitId) {
    return store.signNote(visitId);
  },
  async listFollowUps(visitId) {
    return store.listFollowUps(visitId);
  },
  async listPendingFollowUps() {
    return store.listPendingFollowUps();
  },
  async sendFollowUp(id) {
    return store.sendFollowUp(id);
  },
  async skipFollowUp(id, reason) {
    return store.skipFollowUp(id, reason);
  },
};
