export function clinicSmsFooter(clinicName: string): string {
  return `Sent on behalf of ${clinicName}. Reply STOP to opt out.`;
}

export function composeSmsPreview(body: string, clinicName: string): string {
  return `${body}\n\n${clinicSmsFooter(clinicName)}`;
}

export const SMS_FAIL_COPY: Record<string, { title: string; body: string }> = {
  stop_fail_closed: {
    title: "Not sent — STOP on file",
    body: "This mobile number has opted out. Olive will not send further clinic SMS until they opt in again.",
  },
  missing_messaging_consent: {
    title: "Not sent — no messaging consent",
    body: "CASL requires an active messaging consent for this patient before a clinic SMS can go out.",
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
    body: "Every Olive SMS must identify the clinic as sender.",
  },
};
