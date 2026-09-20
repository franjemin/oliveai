export type SecureMessageInput = {
  clinicId: string;
  patientId: string;
  body: string;
};

export type NotifySmsInput = {
  to: string;
  clinicIdentity: string;
  messageClass: "clinical_transactional" | "promotional";
  magicLink: string;
  /** Must be notify copy only — never the secure/follow-up body. */
  body: string;
};

export type MessagingVendor = {
  createSecureMessage(input: SecureMessageInput): Promise<{ secureMessageId: string }>;
  /** CASL + clinic ID + STOP apply here only. Body must never include PHI. */
  sendNotifySms(input: NotifySmsInput): Promise<{ vendorMessageId: string }>;
};

export function notifySmsCopy(clinicIdentity: string, magicLink: string): string {
  return `${clinicIdentity}: Your dentist sent you a secure message. Tap to view: ${magicLink}\nReply STOP to opt out.`;
}

export function createFakeMessagingVendor(): MessagingVendor & {
  secure: SecureMessageInput[];
  notifies: NotifySmsInput[];
} {
  const secure: SecureMessageInput[] = [];
  const notifies: NotifySmsInput[] = [];
  return {
    secure,
    notifies,
    async createSecureMessage(input) {
      secure.push(input);
      return { secureMessageId: `secure_${secure.length}` };
    },
    async sendNotifySms(input) {
      notifies.push(input);
      return { vendorMessageId: `notify_${notifies.length}` };
    },
  };
}
