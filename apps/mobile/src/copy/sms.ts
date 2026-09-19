/** Notify-text helpers only. The swipe card is a secure message, not this footer. */

export function clinicSmsFooter(clinicName: string): string {
  return `Sent on behalf of ${clinicName}. Reply STOP to opt out.`;
}
