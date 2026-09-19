import { randomUUID } from "node:crypto";

export function newId(): string {
  return randomUUID();
}

export const DEMO = {
  clinicId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
  patientAlexId: "00000000-0000-4000-8000-000000000003",
  patientSamId: "00000000-0000-4000-8000-000000000004",
  visitAlexId: "00000000-0000-4000-8000-000000000005",
  audioDisclosureScriptId: "audio-disclosure-v1",
} as const;
