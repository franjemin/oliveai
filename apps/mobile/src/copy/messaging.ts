import { clinicSmsFooter } from "./sms";

/** Product lock: the card is a secure message. Notify SMS is a short stub, not the body of record. */
export const SECURE_SEND_MICROCOPY = "Patient gets a text to open it securely.";

export function notifyStubBody(clinicName: string, inboxPath: string): string {
  return `${clinicName}: you have a secure message from your clinic. Open: ${inboxPath}\n${clinicSmsFooter(clinicName)}`;
}

export const SEND_FAIL_COPY: Record<string, { title: string; body: string }> = {
  stop_fail_closed: {
    title: "Not sent — STOP on file",
    body: "This mobile number has opted out. Olive will not send a notify text until they opt in again.",
  },
  missing_messaging_consent: {
    title: "Not sent — no messaging consent",
    body: "CASL requires an active messaging consent before we can text a link to the secure message.",
  },
  promotional_fail_closed: {
    title: "Not sent — promotional blocked",
    body: "Promotional messages fail closed without per-class consent.",
  },
  unsigned_note: {
    title: "Not sent — note is still a draft",
    body: "Follow-ups that rely on the clinical note cannot send until the dentist signs.",
  },
  missing_clinic_identity: {
    title: "Not sent — clinic identity missing",
    body: "The notify text must identify the clinic as sender.",
  },
};
