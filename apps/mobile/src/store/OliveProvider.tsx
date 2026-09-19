import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { api } from "@/src/api";
import { startAmbientCapture } from "@/src/api/recordingGate";
import type {
  CaptureSession,
  Clinic,
  ConsentParty,
  DayFeed,
  FeatureFlags,
  ChatThread,
  FollowUp,
  MagicInbox,
  Note,
  NotifyStub,
  Patient,
  RecordingGate,
  TranscriptResponse,
  User,
  Visit,
} from "@/src/api/types";
import { DISCLOSURE_SCRIPT_ID } from "@/src/theme/tokens";
import { resetState } from "@/src/api/mock/store";

type OliveContextValue = {
  user: User;
  clinic: Clinic;
  flags: FeatureFlags;
  day: DayFeed;
  refreshDay: () => Promise<void>;
  resetDemo: () => Promise<void>;
  openVisit: (patientId: string) => Promise<Visit>;
  getVisit: (id: string) => Promise<Visit>;
  acceptConsent: (visitId: string, obtainedFrom: ConsentParty) => Promise<CaptureSession>;
  refuseConsent: (visitId: string, obtainedFrom: ConsentParty) => Promise<void>;
  gate: (visitId: string) => Promise<RecordingGate>;
  endVisit: (visitId: string) => Promise<Visit>;
  getNote: (visitId: string) => Promise<Note>;
  patchNote: (visitId: string, body: string) => Promise<Note>;
  signNote: (visitId: string) => Promise<Note>;
  getTranscript: (visitId: string) => Promise<TranscriptResponse>;
  pendingFollowUps: () => Promise<FollowUp[]>;
  sendFollowUp: (id: string) => Promise<FollowUp>;
  skipFollowUp: (id: string) => Promise<FollowUp>;
  saveFollowUpEdit: (id: string, before: string, after: string) => Promise<FollowUp>;
  finishDay: () => Promise<FollowUp[]>;
  getPatient: (id: string) => Promise<Patient>;
  getChat: (patientId: string) => Promise<{ thread: ChatThread | null; messages: ChatThread["messages"] }>;
  listThreads: () => Promise<ChatThread[]>;
  lastNotify: (followUpId: string) => Promise<NotifyStub | null>;
  getInbox: (token: string) => Promise<MagicInbox>;
};

const OliveContext = createContext<OliveContextValue | null>(null);

export function OliveProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(() => ({
    user: {
      id: "00000000-0000-4000-8000-000000000002",
      clinicId: "00000000-0000-4000-8000-000000000001",
      email: "od@demo.olive.local",
      name: "Dr. Maya Chen",
      role: "od" as const,
    },
    clinic: {
      id: "00000000-0000-4000-8000-000000000001",
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
    },
    flags: {
      aftercare: false,
      claimsGuard: false,
      phiTrainingAllowed: false,
      odWriteback: false,
      quebecLaw25: false,
    },
  }));
  const [day, setDay] = useState<DayFeed>({ date: "2026-09-19", patients: [] });

  const refreshDay = useCallback(async () => {
    const feed = await api.dayPatients("2026-09-19");
    setDay(feed);
  }, []);

  useEffect(() => {
    void refreshDay();
  }, [refreshDay]);

  const value = useMemo<OliveContextValue>(
    () => ({
      user: boot.user,
      clinic: boot.clinic,
      flags: boot.flags,
      day,
      refreshDay,
      resetDemo: async () => {
        resetState();
        await refreshDay();
      },
      openVisit: async (patientId) => {
        const visit = await api.createVisit(patientId);
        await refreshDay();
        return visit;
      },
      getVisit: (id) => api.getVisit(id),
      acceptConsent: async (visitId, obtainedFrom) => {
        await api.recordVisitConsent(visitId, {
          type: "audio_capture",
          granted: true,
          visitId,
          disclosureScriptId: DISCLOSURE_SCRIPT_ID,
          channel: "in_app",
          obtainedFrom,
        });
        const capture = await startAmbientCapture(api, visitId);
        const { attachLiveTranscript } = await import("@/src/api/mock/store");
        attachLiveTranscript(visitId);
        await refreshDay();
        return capture;
      },
      refuseConsent: async (visitId, obtainedFrom) => {
        await api.recordVisitConsent(visitId, {
          type: "audio_capture",
          granted: false,
          visitId,
          disclosureScriptId: DISCLOSURE_SCRIPT_ID,
          channel: "in_app",
          obtainedFrom,
        });
        const gate = await api.recordingGate(visitId);
        if (gate.allowed) {
          throw new Error("Refuse must keep the recording gate closed");
        }
        await api.endVisit(visitId);
        await refreshDay();
      },
      gate: (visitId) => api.recordingGate(visitId),
      endVisit: async (visitId) => {
        const visit = await api.endVisit(visitId);
        await refreshDay();
        return visit;
      },
      getNote: (visitId) => api.getNote(visitId),
      patchNote: (visitId, body) => api.patchNote(visitId, body),
      signNote: (visitId) => api.signNote(visitId),
      getTranscript: (visitId) => api.getTranscript(visitId),
      pendingFollowUps: () => api.listPendingFollowUps(),
      sendFollowUp: (id) => api.sendFollowUp(id),
      skipFollowUp: (id) => api.skipFollowUp(id),
      saveFollowUpEdit: async (id, before, after) => {
        const updated = await api.patchFollowUp(id, after);
        await api.recordFollowUpEdit(id, before, after);
        return updated;
      },
      finishDay: async () => {
        const res = await api.finishDay("2026-09-19");
        return res.queued;
      },
      getPatient: (id) => api.getPatient(id),
      getChat: (patientId) => api.getChat(patientId),
      listThreads: () => api.listThreads(),
      lastNotify: (followUpId) => api.lastNotify(followUpId),
      getInbox: (token) => api.getInbox(token),
    }),
    [boot, day, refreshDay],
  );

  return <OliveContext.Provider value={value}>{children}</OliveContext.Provider>;
}

export function useOlive() {
  const ctx = useContext(OliveContext);
  if (!ctx) throw new Error("useOlive must be used within OliveProvider");
  return ctx;
}
