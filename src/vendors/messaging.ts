export type OutboundMessage = {
  to: string;
  body: string;
  clinicIdentity: string;
  messageClass: "clinical_transactional" | "promotional";
  channel: "sms" | "secure_thread";
};

export type MessagingVendor = {
  send(message: OutboundMessage): Promise<{ vendorMessageId: string }>;
};

export function createFakeMessagingVendor(
  sent: OutboundMessage[] = [],
): MessagingVendor & { sent: OutboundMessage[] } {
  return {
    sent,
    async send(message) {
      sent.push(message);
      return { vendorMessageId: `fake_${sent.length}` };
    },
  };
}
