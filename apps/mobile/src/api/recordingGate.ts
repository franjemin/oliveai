import type { CaptureSession, OliveApi } from "./types";
import { ApiError } from "./types";

/**
 * Fail-closed microphone gate (OLI-9).
 * Capture must never start unless recording-gate returns allowed.
 */
export async function startAmbientCapture(
  api: OliveApi,
  visitId: string,
): Promise<CaptureSession> {
  const gate = await api.recordingGate(visitId);
  if (!gate.allowed) {
    throw new ApiError({
      error: "recording_gate_denied",
      message: "Microphone stays closed until visit-scoped consent is on file.",
      details: { reason: gate.reason },
    });
  }
  return {
    visitId,
    disclosureScriptId: gate.disclosureScriptId,
    startedAt: new Date().toISOString(),
  };
}
