import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { USE_MOCKS, api } from "@/src/api";
import { startAmbientCapture } from "@/src/api/recordingGate";
import { clinicDayDates, CORE_WALKTHROUGH, ensureSeededVisit } from "@/src/api/walkthrough";
import type {
  CaptureSession,
  Clinic,
  ConsentParty,
  DayFeed,
  FeatureFlags,
  ChatThread,
  ChatThreadView,
  FinishDayResult,
  FollowUp,
  FollowUpSendResult,
  MagicInbox,
  Note,
  NotifyStub,
  Patient,
  RecordingGate,
  TranscriptResponse,
  User,
  Visit,
} from "@/src/api/types";
import { DEMO } from "@/src/api/types";
import { DISCLOSURE_SCRIPT_ID } from "@/src/theme/tokens";
import { resetState } from "@/src/api/mock/store";

type OliveContextValue = {
  user: User;
  clinic: Clinic;
  flags: FeatureFlags;
  day: DayFeed;
  sessionReady: boolean;
  sessionError: string | null;
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
  sendFollowUp: (id: string) => Promise<FollowUpSendResult>;
  skipFollowUp: (id: string) => Promise<FollowUp>;
  saveFollowUpEdit: (id: string, before: string, after: string) => Promise<FollowUp>;
  finishDay: () => Promise<FinishDayResult>;
  unsignedNotes: () => Promise<{ visitId: string; displayName: string; note: Note }[]>;
  getPatient: (id: string) => Promise<Patient>;
  getChat: (patientId: string) => Promise<{ thread: ChatThread | null; messages: ChatThreadView["messages"] }>;
  listThreads: () => Promise<ChatThreadView[]>;
  lastNotify: (followUpId: string) => Promise<NotifyStub | null>;
  getInbox: (token: string) => Promise<MagicInbox>;
};

const OliveContext = createContext<OliveContextValue | null>(null);

const seedBoot = {
  user: {
    id: DEMO.userId,
    clinicId: DEMO.clinicId,
    email: DEMO.loginEmail,
    name: "Dr. Maya Chen",
    role: "dentist" as const,
    tenantId: DEMO.clinicId,
  },
  clinic: {
    id: DEMO.clinicId,
    tenantId: DEMO.clinicId,
    name: "Harbourfront Dental",
    legalName: "Harbourfront Dental Inc.",
    smsIdentity: "Harbourfront Dental",
    phone: "+1-416-555-0199",
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
};

export function OliveProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(seedBoot.user);
  const [clinic, setClinic] = useState<Clinic>(seedBoot.clinic);
  const [flags, setFlags] = useState<FeatureFlags>(seedBoot.flags);
  const [day, setDay] = useState<DayFeed>({ date: DEMO.date, patients: [] });
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const refreshDay = useCallback(async () => {
    let feed: DayFeed = { date: clinicDayDates()[0] ?? DEMO.date, patients: [] };
    for (const date of clinicDayDates()) {
      const next = await api.dayPatients(date).catch(() => ({ date, patients: [] as DayFeed["patients"] }));
      if (next.patients.length > 0) {
        feed = next;
        break;
      }
    }
    try {
      const visit = await api.getVisit(CORE_WALKTHROUGH.visitId);
      const patient = await api.getPatient(visit.patientId).catch(() => null);
      feed = ensureSeededVisit(feed, visit, patient);
    } catch {
      /* visit overlay is best-effort — mocks always have it */
    }
    setDay(feed);
  }, []);

  const boot = useCallback(async () => {
    try {
      const session = await api.login(CORE_WALKTHROUGH.loginEmail, CORE_WALKTHROUGH.loginPassword);
      setUser(session.user);
      setClinic({
        ...session.clinic,
        tenantId: session.clinic.tenantId ?? session.clinic.id,
      });
      setFlags(session.flags);
      setSessionError(null);
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : "Demo login failed");
    }
    await refreshDay();
    setSessionReady(true);
  }, [refreshDay]);

  useEffect(() => {
    void boot();
  }, [boot]);

  const value = useMemo<OliveContextValue>(
    () => ({
      user,
      clinic,
      flags,
      day,
      sessionReady,
      sessionError,
      refreshDay,
      resetDemo: async () => {
        resetState();
        await boot();
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
        if (USE_MOCKS) {
          const { attachLiveTranscript } = await import("@/src/api/mock/store");
          attachLiveTranscript(visitId);
        } else {
          await api.postVisitAudio(visitId, CORE_WALKTHROUGH.demoAudioBase64);
          await api.processJobs();
        }
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
        await api.getNote(visitId);
        await refreshDay();
        return visit;
      },
      getNote: (visitId) => api.getNote(visitId),
      patchNote: async (visitId, body) => {
        const current = await api.getNote(visitId);
        const next = await api.patchNote(visitId, body);
        await api.recordLearningEvent({
          source: "note_edit",
          before: current.body,
          after: next.body,
          resourceId: next.id,
        });
        return next;
      },
      signNote: async (visitId) => {
        const current = await api.getNote(visitId);
        const signed = await api.signNote(visitId);
        await api.recordLearningEvent({
          source: "note_sign",
          before: current.body,
          after: signed.body,
          resourceId: signed.id,
        });
        const existing = await api.listFollowUps(visitId);
        if (existing.length === 0) {
          await api.createFollowUp(
            visitId,
            CORE_WALKTHROUGH.followUpBody,
            "clinical_transactional",
          );
        }
        await refreshDay();
        return signed;
      },
      getTranscript: (visitId) => api.getTranscript(visitId),
      pendingFollowUps: () => api.listPendingFollowUps(),
      sendFollowUp: (id) => api.sendFollowUp(id),
      skipFollowUp: (id) => api.skipFollowUp(id),
      saveFollowUpEdit: async (id, before, after) => {
        const updated = await api.patchFollowUp(id, after);
        await api.recordFollowUpEdit(id, before, after);
        await api.recordLearningEvent({
          source: "follow_up_edit",
          before,
          after,
          resourceId: id,
        });
        return updated;
      },
      finishDay: async () => {
        const result = await api.finishDay(day.date);
        await refreshDay();
        return result;
      },
      unsignedNotes: async () => {
        const rows: { visitId: string; displayName: string; note: Note }[] = [];
        for (const patient of day.patients) {
          if (!patient.visitId) continue;
          if (patient.unsignedDraft === false) continue;
          const looksDone =
            patient.unsignedDraft === true ||
            patient.visitStatus === "completed" ||
            patient.recording === "captured" ||
            patient.recording === "declined";
          if (!looksDone) continue;
          const note = await api.getNote(patient.visitId).catch(() => null);
          if (note?.status === "draft") {
            rows.push({ visitId: patient.visitId, displayName: patient.displayName, note });
          }
        }
        return rows;
      },
      getPatient: (id) => api.getPatient(id),
      getChat: (patientId) => api.getChat(patientId),
      listThreads: () => api.listThreads(),
      lastNotify: (followUpId) => api.lastNotify(followUpId),
      getInbox: (token) => api.getInbox(token),
    }),
    [user, clinic, flags, day, sessionReady, sessionError, refreshDay, boot],
  );

  return <OliveContext.Provider value={value}>{children}</OliveContext.Provider>;
}

export function useOlive() {
  const ctx = useContext(OliveContext);
  if (!ctx) throw new Error("useOlive must be used within OliveProvider");
  return ctx;
}
